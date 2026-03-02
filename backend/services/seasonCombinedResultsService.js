import mongoose from "mongoose";
import PredictionRound from "../models/PredictionRound.js";
import PredictionScore from "../models/PredictionScore.js";
import Race from "../models/Race.js";
import Season from "../models/Season.js";
import User from "../models/User.js";

const { Types } = mongoose;

const toIdString = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
};

const roundToTwo = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100) / 100;
};

const getUserLabel = (user) => {
  if (!user || typeof user !== "object") return "-";
  if (typeof user.realname === "string" && user.realname.trim()) return user.realname.trim();
  if (typeof user.username === "string" && user.username.trim()) return user.username.trim();
  return "-";
};

export class SeasonCombinedResultsError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "SeasonCombinedResultsError";
    this.statusCode = statusCode;
  }
}

const ensureSeasonId = (seasonId) => {
  if (!Types.ObjectId.isValid(seasonId)) {
    throw new SeasonCombinedResultsError("Ungültige Season-ID.", 400);
  }
  return new Types.ObjectId(seasonId);
};

const rankRows = (rows, field, rankField) => {
  const sorted = [...rows].sort((a, b) => {
    const diff = Number(b?.[field] || 0) - Number(a?.[field] || 0);
    if (diff !== 0) return diff;
    const aName = getUserLabel(a?.user);
    const bName = getUserLabel(b?.user);
    return aName.localeCompare(bName, "de-CH");
  });

  let previousPoints = null;
  let previousRank = 0;
  sorted.forEach((row, index) => {
    const points = Number(row?.[field] || 0);
    const rank = previousPoints !== null && points === previousPoints ? previousRank : index + 1;
    row[rankField] = rank;
    previousPoints = points;
    previousRank = rank;
  });

  return sorted;
};

const sortRacesByNameAndId = (races) =>
  [...races].sort((a, b) => {
    const aName = typeof a?.name === "string" ? a.name : "";
    const bName = typeof b?.name === "string" ? b.name : "";
    const byName = aName.localeCompare(bName, "de-CH", { numeric: true, sensitivity: "base" });
    if (byName !== 0) return byName;
    return String(a?._id || "").localeCompare(String(b?._id || ""));
  });

const sortPredictionRounds = (rounds, raceOrderIndex = new Map()) =>
  [...rounds].sort((a, b) => {
    const aRaceId = toIdString(a?.race);
    const bRaceId = toIdString(b?.race);
    const aRaceOrder = raceOrderIndex.has(aRaceId)
      ? raceOrderIndex.get(aRaceId)
      : Number.MAX_SAFE_INTEGER;
    const bRaceOrder = raceOrderIndex.has(bRaceId)
      ? raceOrderIndex.get(bRaceId)
      : Number.MAX_SAFE_INTEGER;
    if (aRaceOrder !== bRaceOrder) return aRaceOrder - bRaceOrder;

    const aPublished = a?.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bPublished = b?.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    if (aPublished !== bPublished) return aPublished - bPublished;
    const aRaceName = typeof a?.race?.name === "string" ? a.race.name : "";
    const bRaceName = typeof b?.race?.name === "string" ? b.race.name : "";
    const byRace = aRaceName.localeCompare(bRaceName, "de-CH", {
      numeric: true,
      sensitivity: "base",
    });
    if (byRace !== 0) return byRace;
    return String(a?._id || "").localeCompare(String(b?._id || ""));
  });

export const getSeasonCombinedResults = async ({ seasonId }) => {
  const normalizedSeasonId = ensureSeasonId(seasonId);

  const season = await Season.findById(normalizedSeasonId)
    .populate("participants", "realname username role")
    .select("name eventDate participants isCurrent isCompleted");

  if (!season) {
    throw new SeasonCombinedResultsError("Season nicht gefunden.", 404);
  }

  const [races, publishedRounds] = await Promise.all([
    Race.find({ season: normalizedSeasonId })
      .select("name season results")
      .populate("results.user", "realname username role"),
    PredictionRound.find({
      season: normalizedSeasonId,
      status: "published",
    })
      .select("season race status requiresReview publishedAt scoredAt")
      .populate("race", "name"),
  ]);

  const publishedRoundIds = publishedRounds.map((round) => round._id);
  const predictionScores = publishedRoundIds.length
    ? await PredictionScore.find({ roundId: { $in: publishedRoundIds } })
        .select("roundId userId total isOverridden overrideAt updatedAt")
        .populate("userId", "realname username role")
    : [];

  const userMap = new Map();
  const ensureUser = (userLike) => {
    const userId = toIdString(userLike);
    if (!userId) return null;
    if (!userMap.has(userId)) {
      userMap.set(userId, {
        _id: userId,
        realname:
          typeof userLike?.realname === "string" ? userLike.realname : undefined,
        username:
          typeof userLike?.username === "string" ? userLike.username : undefined,
      });
    } else if (userLike && typeof userLike === "object") {
      const current = userMap.get(userId);
      if (!current.realname && typeof userLike.realname === "string") {
        current.realname = userLike.realname;
      }
      if (!current.username && typeof userLike.username === "string") {
        current.username = userLike.username;
      }
    }
    return userId;
  };

  (season.participants || []).forEach((participant) => ensureUser(participant));
  races.forEach((race) => {
    (race.results || []).forEach((result) => ensureUser(result.user));
  });
  predictionScores.forEach((score) => ensureUser(score.userId));

  const missingUserIds = [...userMap.keys()].filter((userId) => {
    const user = userMap.get(userId);
    return !user?.realname && !user?.username;
  });

  if (missingUserIds.length) {
    const missingUsers = await User.find({ _id: { $in: missingUserIds } }).select(
      "realname username",
    );
    missingUsers.forEach((userDoc) => ensureUser(userDoc));
  }

  const sortedRaces = sortRacesByNameAndId(races);
  const raceOrderIndex = new Map(
    sortedRaces.map((race, index) => [toIdString(race._id), index]),
  );

  const raceTotalsByUser = new Map();
  const racePointsByRaceId = new Map();
  sortedRaces.forEach((race) => {
    const raceId = toIdString(race._id);
    const raceMap = new Map();
    (race.results || []).forEach((result) => {
      const userId = ensureUser(result.user);
      if (!userId) return;
      const points = roundToTwo(result.pointsEarned || 0);
      raceTotalsByUser.set(userId, roundToTwo((raceTotalsByUser.get(userId) || 0) + points));
      raceMap.set(userId, points);
    });
    racePointsByRaceId.set(raceId, raceMap);
  });

  const predictionTotalsByUser = new Map();
  const predictionPointsByRoundId = new Map();
  predictionScores.forEach((score) => {
    const userId = ensureUser(score.userId);
    if (!userId) return;
    const roundId = toIdString(score.roundId);
    const points = roundToTwo(score.total || 0);
    predictionTotalsByUser.set(
      userId,
      roundToTwo((predictionTotalsByUser.get(userId) || 0) + points),
    );
    if (!predictionPointsByRoundId.has(roundId)) {
      predictionPointsByRoundId.set(roundId, new Map());
    }
    predictionPointsByRoundId.get(roundId).set(userId, points);
  });

  const rows = [...userMap.values()].map((user) => {
    const userId = String(user._id);
    const racePoints = roundToTwo(raceTotalsByUser.get(userId) || 0);
    const predictionPoints = roundToTwo(predictionTotalsByUser.get(userId) || 0);
    const combinedPoints = roundToTwo(racePoints + predictionPoints);
    return {
      user: {
        _id: userId,
        realname: user.realname || "",
        username: user.username || "",
      },
      racePoints,
      predictionPoints,
      combinedPoints,
    };
  });

  rankRows(rows, "racePoints", "raceRank");
  rankRows(rows, "predictionPoints", "predictionRank");
  const rankedCombined = rankRows(rows, "combinedPoints", "combinedRank");

  const includedPredictionRounds = sortPredictionRounds(
    publishedRounds,
    raceOrderIndex,
  ).map((round) => {
    const roundId = toIdString(round._id);
    return {
      _id: roundId,
      race: round.race
        ? {
            _id: toIdString(round.race),
            name: round.race.name || "-",
          }
        : null,
      status: round.status,
      requiresReview: !!round.requiresReview,
      publishedAt: round.publishedAt || null,
      userPoints: rankedCombined.map((row) => ({
        userId: row.user._id,
        points: roundToTwo(predictionPointsByRoundId.get(roundId)?.get(row.user._id) || 0),
      })),
    };
  });

  return {
    season: {
      _id: toIdString(season._id),
      name: season.name,
      eventDate: season.eventDate,
      isCurrent: !!season.isCurrent,
      isCompleted: !!season.isCompleted,
    },
    meta: {
      raceCount: races.length,
      publishedPredictionRounds: includedPredictionRounds.length,
      reviewRequiredPublishedPredictionRounds: includedPredictionRounds.filter(
        (round) => round.requiresReview,
      ).length,
      combinedFormula: "racePoints + predictionPoints",
      recalculatedAt: new Date(),
    },
    standings: rankedCombined,
    races: sortedRaces.map((race) => ({
      _id: toIdString(race._id),
      name: race.name || "-",
      userPoints: rankedCombined.map((row) => ({
        userId: row.user._id,
        points: roundToTwo(racePointsByRaceId.get(toIdString(race._id))?.get(row.user._id) || 0),
      })),
    })),
    includedPredictionRounds,
  };
};

export const getCurrentSeasonCombinedResults = async () => {
  const currentSeason = await Season.findOne({ isCurrent: true }).select("_id");
  if (!currentSeason) {
    throw new SeasonCombinedResultsError("Keine aktuelle Season gesetzt.", 404);
  }
  return getSeasonCombinedResults({ seasonId: currentSeason._id });
};
