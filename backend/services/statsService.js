import mongoose from "mongoose";
import PredictionRound from "../models/PredictionRound.js";
import PredictionScore from "../models/PredictionScore.js";
import Race from "../models/Race.js";
import Season from "../models/Season.js";
import User from "../models/User.js";
import UserStatsCache from "../models/UserStatsCache.js";
import { getCurrentStatsRevision } from "../utils/statsRevision.js";

const toIdString = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  if (typeof value === "object" && value._id) return toIdString(value._id);
  return String(value);
};

const roundTo = (value, digits = 4) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const sortByObjectIdAsc = (a, b) =>
  a._id.toString().localeCompare(b._id.toString());

const buildRanking = (pointsByUser) => {
  const entries = Object.entries(pointsByUser).sort((a, b) => b[1] - a[1]);
  const ranking = {};
  let rank = 1;

  entries.forEach(([userId, points], index) => {
    if (index > 0 && points < entries[index - 1][1]) {
      rank = index + 1;
    }
    ranking[userId] = rank;
  });

  return ranking;
};

const collectPublishedPredictionData = async (seasonIds) => {
  if (!Array.isArray(seasonIds) || seasonIds.length === 0) {
    return new Map();
  }

  const rounds = await PredictionRound.find({
    season: { $in: seasonIds },
    status: "published",
  })
    .select("_id season race")
    .populate("race", "name")
    .lean();

  if (rounds.length === 0) {
    return new Map();
  }

  const roundIds = rounds.map((round) => round._id);
  const scoreDocs = await PredictionScore.find({ roundId: { $in: roundIds } })
    .select("roundId userId total")
    .lean();

  const scoresByRoundId = new Map();
  scoreDocs.forEach((scoreDoc) => {
    const roundId = toIdString(scoreDoc?.roundId);
    if (!roundId) return;
    if (!scoresByRoundId.has(roundId)) {
      scoresByRoundId.set(roundId, []);
    }
    scoresByRoundId.get(roundId).push(scoreDoc);
  });

  const bySeason = new Map();
  rounds.forEach((round) => {
    const seasonId = toIdString(round?.season);
    const raceId = toIdString(round?.race);
    const roundId = toIdString(round?._id);

    if (!seasonId || !raceId || !roundId) {
      return;
    }

    if (!bySeason.has(seasonId)) {
      bySeason.set(seasonId, {
        rounds: [],
        roundsByRaceId: new Map(),
      });
    }

    const userPoints = new Map();
    (scoresByRoundId.get(roundId) || []).forEach((scoreDoc) => {
      const userId = toIdString(scoreDoc?.userId);
      if (!userId) return;
      userPoints.set(userId, Number(scoreDoc?.total) || 0);
    });

    const roundData = {
      roundId,
      raceId,
      raceName: round?.race?.name || "-",
      userPoints,
    };

    const seasonEntry = bySeason.get(seasonId);
    seasonEntry.rounds.push(roundData);
    seasonEntry.roundsByRaceId.set(raceId, roundData);
  });

  return bySeason;
};

const selectCompletedSeasons = (seasons, completedOnly) => {
  if (!completedOnly) return seasons;
  return seasons.filter((season) => season.isCompleted === true);
};

const buildNotParticipatedSeasonStats = ({ season, races }) => ({
  seasonId: toIdString(season._id),
  seasonName: season.name,
  eventDate: season.eventDate,
  participationStatus: "not_participated",
  participationLabel: "Nicht teilgenommen",
  includedInOverall: false,
  raceCount: races.length,
  totalPoints: null,
  predictionRoundCount: null,
  predictionPoints: null,
  predictionPodiumCount: null,
  predictionTop3Rate: null,
  avgPredictionPointsPerRound: null,
  podiumCount: null,
  top3Rate: null,
  combinedPoints: null,
  avgCombinedPointsPerRace: null,
  bestRace: null,
  worstRace: null,
  bestPredictionRound: null,
  worstPredictionRound: null,
  finalRank: null,
  finalCombinedRank: null,
  rankChange: null,
  combinedRankChange: null,
  isSeasonWinner: false,
  isSharedSeasonWin: false,
  isCombinedSeasonWinner: false,
  isSharedCombinedSeasonWin: false,
  races: [],
});

const buildSeasonStatsForUser = ({
  season,
  races,
  userId,
  participantIds,
  predictionData = null,
}) => {
  const normalizedParticipantIds = [...new Set(participantIds)];
  const roundsByRaceId = predictionData?.roundsByRaceId || new Map();

  const cumulativeTotals = {};
  const cumulativePredictionTotals = {};
  const cumulativeCombinedTotals = {};
  normalizedParticipantIds.forEach((id) => {
    cumulativeTotals[id] = 0;
    cumulativePredictionTotals[id] = 0;
    cumulativeCombinedTotals[id] = 0;
  });

  let totalPoints = 0;
  let predictionPoints = 0;
  let podiumCount = 0;
  let predictionPodiumCount = 0;
  let predictionRoundCount = 0;
  let firstInterimRank = null;
  let finalRank = null;
  let firstCombinedInterimRank = null;
  let finalCombinedRank = null;
  let bestRace = null;
  let worstRace = null;
  let bestPredictionRound = null;
  let worstPredictionRound = null;

  const raceDetails = races.map((race, index) => {
    const racePointsByUser = {};
    normalizedParticipantIds.forEach((id) => {
      racePointsByUser[id] = 0;
    });

    (race.results || []).forEach((result) => {
      const resultUserId = toIdString(result?.user);
      if (resultUserId && resultUserId in racePointsByUser) {
        racePointsByUser[resultUserId] = Number(result?.pointsEarned) || 0;
      }
    });

    const raceRanking = buildRanking(racePointsByUser);
    const userRacePoints = racePointsByUser[userId] || 0;
    const userRaceRank = raceRanking[userId] || normalizedParticipantIds.length;

    normalizedParticipantIds.forEach((id) => {
      cumulativeTotals[id] += racePointsByUser[id] || 0;
    });

    const cumulativeRanking = buildRanking(cumulativeTotals);
    const userCumulativeRank =
      cumulativeRanking[userId] || normalizedParticipantIds.length;

    if (index === 0) {
      firstInterimRank = userCumulativeRank;
    }

    finalRank = userCumulativeRank;
    totalPoints += userRacePoints;

    const raceId = toIdString(race._id);
    const roundForRace = raceId ? roundsByRaceId.get(raceId) : null;

    let userPredictionPoints = 0;
    let userPredictionRank = null;
    let isPredictionPodium = false;

    if (roundForRace) {
      const predictionPointsByUser = {};
      normalizedParticipantIds.forEach((id) => {
        const roundPoints = Number(roundForRace.userPoints?.get(id)) || 0;
        predictionPointsByUser[id] = roundPoints;
        cumulativePredictionTotals[id] += roundPoints;
      });

      const predictionRanking = buildRanking(predictionPointsByUser);
      userPredictionPoints = predictionPointsByUser[userId] || 0;
      userPredictionRank =
        predictionRanking[userId] || normalizedParticipantIds.length;
      isPredictionPodium = userPredictionRank <= 3;

      predictionRoundCount += 1;
      predictionPoints += userPredictionPoints;
      if (isPredictionPodium) {
        predictionPodiumCount += 1;
      }

      if (
        !bestPredictionRound ||
        userPredictionPoints > bestPredictionRound.points
      ) {
        bestPredictionRound = {
          roundId: roundForRace.roundId,
          raceId: roundForRace.raceId,
          raceName: roundForRace.raceName,
          points: userPredictionPoints,
        };
      }

      if (
        !worstPredictionRound ||
        userPredictionPoints < worstPredictionRound.points
      ) {
        worstPredictionRound = {
          roundId: roundForRace.roundId,
          raceId: roundForRace.raceId,
          raceName: roundForRace.raceName,
          points: userPredictionPoints,
        };
      }
    }

    normalizedParticipantIds.forEach((id) => {
      cumulativeCombinedTotals[id] =
        (cumulativeTotals[id] || 0) + (cumulativePredictionTotals[id] || 0);
    });

    const combinedRanking = buildRanking(cumulativeCombinedTotals);
    const userCombinedRank =
      combinedRanking[userId] || normalizedParticipantIds.length;

    if (index === 0) {
      firstCombinedInterimRank = userCombinedRank;
    }
    finalCombinedRank = userCombinedRank;

    const isPodium = userRaceRank <= 3;
    if (isPodium) {
      podiumCount += 1;
    }

    if (!bestRace || userRacePoints > bestRace.points) {
      bestRace = {
        raceId: toIdString(race._id),
        raceName: race.name || `Rennen ${index + 1}`,
        points: userRacePoints,
      };
    }

    if (!worstRace || userRacePoints < worstRace.points) {
      worstRace = {
        raceId: toIdString(race._id),
        raceName: race.name || `Rennen ${index + 1}`,
        points: userRacePoints,
      };
    }

    return {
      raceId: toIdString(race._id),
      raceName: race.name || `Rennen ${index + 1}`,
      raceIndex: index + 1,
      points: userRacePoints,
      cumulativePoints: cumulativeTotals[userId] || 0,
      raceRank: userRaceRank,
      cumulativeRank: userCumulativeRank,
      isPodium,
      predictionPoints: userPredictionPoints,
      cumulativePredictionPoints: cumulativePredictionTotals[userId] || 0,
      predictionRank: userPredictionRank,
      isPredictionPodium,
      combinedPoints: userRacePoints + userPredictionPoints,
      cumulativeCombinedPoints: cumulativeCombinedTotals[userId] || 0,
      combinedRank: userCombinedRank,
    };
  });

  const raceCount = raceDetails.length;
  const combinedPoints = totalPoints + predictionPoints;
  const topRankCount =
    raceCount > 0
      ? Object.values(buildRanking(cumulativeTotals)).filter((rank) => rank === 1)
          .length
      : 0;
  const topCombinedRankCount =
    raceCount > 0
      ? Object.values(buildRanking(cumulativeCombinedTotals)).filter(
          (rank) => rank === 1,
        ).length
      : 0;
  const top3Rate =
    raceCount > 0 ? Number((podiumCount / raceCount).toFixed(4)) : 0;
  const predictionTop3Rate =
    predictionRoundCount > 0
      ? Number((predictionPodiumCount / predictionRoundCount).toFixed(4))
      : 0;

  return {
    seasonId: toIdString(season._id),
    seasonName: season.name,
    eventDate: season.eventDate,
    participationStatus: "participated",
    participationLabel: "Teilgenommen",
    includedInOverall: raceCount > 0 || predictionRoundCount > 0,
    raceCount,
    totalPoints,
    predictionRoundCount,
    predictionPoints,
    predictionPodiumCount,
    predictionTop3Rate,
    avgPredictionPointsPerRound:
      predictionRoundCount > 0
        ? roundTo(predictionPoints / predictionRoundCount)
        : 0,
    podiumCount,
    top3Rate,
    combinedPoints,
    avgCombinedPointsPerRace: raceCount > 0 ? roundTo(combinedPoints / raceCount) : 0,
    bestRace,
    worstRace,
    bestPredictionRound,
    worstPredictionRound,
    finalRank: finalRank ?? null,
    finalCombinedRank: finalCombinedRank ?? null,
    rankChange:
      firstInterimRank != null && finalRank != null
        ? firstInterimRank - finalRank
        : null,
    combinedRankChange:
      firstCombinedInterimRank != null && finalCombinedRank != null
        ? firstCombinedInterimRank - finalCombinedRank
        : null,
    isSeasonWinner: raceCount > 0 && finalRank === 1,
    isSharedSeasonWin: raceCount > 0 && finalRank === 1 && topRankCount > 1,
    isCombinedSeasonWinner: raceCount > 0 && finalCombinedRank === 1,
    isSharedCombinedSeasonWin:
      raceCount > 0 && finalCombinedRank === 1 && topCombinedRankCount > 1,
    races: raceDetails,
  };
};

const buildOverallStats = (seasonStats) => {
  const includedSeasons = seasonStats.filter((season) => season.includedInOverall);

  const totals = {
    completedSeasonsCount: seasonStats.length,
    participatedSeasonsCount: includedSeasons.length,
    seasonsCount: includedSeasons.length,
    raceCount: 0,
    totalPoints: 0,
    predictionRoundCount: 0,
    predictionPoints: 0,
    predictionPodiumCount: 0,
    predictionTop3Rate: 0,
    avgPredictionPointsPerRound: 0,
    podiumCount: 0,
    top3Rate: 0,
    avgPointsPerRace: 0,
    combinedPoints: 0,
    avgCombinedPointsPerRace: 0,
    avgSeasonEndRank: null,
    avgCombinedSeasonEndRank: null,
    seasonsWon: 0,
    bestRace: null,
    worstRace: null,
    bestPredictionRound: null,
    worstPredictionRound: null,
  };

  let finalRankSum = 0;
  let finalRankCount = 0;
  let finalCombinedRankSum = 0;
  let finalCombinedRankCount = 0;

  includedSeasons.forEach((season) => {
    totals.raceCount += season.raceCount || 0;
    totals.totalPoints += season.totalPoints || 0;
    totals.predictionRoundCount += season.predictionRoundCount || 0;
    totals.predictionPoints += season.predictionPoints || 0;
    totals.predictionPodiumCount += season.predictionPodiumCount || 0;
    totals.podiumCount += season.podiumCount || 0;
    if (season.isSeasonWinner) {
      totals.seasonsWon += 1;
    }

    if (season.bestRace) {
      const candidate = {
        ...season.bestRace,
        seasonId: season.seasonId,
        seasonName: season.seasonName,
      };
      if (!totals.bestRace || candidate.points > totals.bestRace.points) {
        totals.bestRace = candidate;
      }
    }

    if (season.worstRace) {
      const candidate = {
        ...season.worstRace,
        seasonId: season.seasonId,
        seasonName: season.seasonName,
      };
      if (!totals.worstRace || candidate.points < totals.worstRace.points) {
        totals.worstRace = candidate;
      }
    }

    if (season.bestPredictionRound) {
      const candidate = {
        ...season.bestPredictionRound,
        seasonId: season.seasonId,
        seasonName: season.seasonName,
      };
      if (
        !totals.bestPredictionRound ||
        candidate.points > totals.bestPredictionRound.points
      ) {
        totals.bestPredictionRound = candidate;
      }
    }

    if (season.worstPredictionRound) {
      const candidate = {
        ...season.worstPredictionRound,
        seasonId: season.seasonId,
        seasonName: season.seasonName,
      };
      if (
        !totals.worstPredictionRound ||
        candidate.points < totals.worstPredictionRound.points
      ) {
        totals.worstPredictionRound = candidate;
      }
    }

    if (typeof season.finalRank === "number" && Number.isFinite(season.finalRank)) {
      finalRankSum += season.finalRank;
      finalRankCount += 1;
    }

    if (
      typeof season.finalCombinedRank === "number" &&
      Number.isFinite(season.finalCombinedRank)
    ) {
      finalCombinedRankSum += season.finalCombinedRank;
      finalCombinedRankCount += 1;
    }
  });

  totals.top3Rate =
    totals.raceCount > 0
      ? roundTo(totals.podiumCount / totals.raceCount)
      : 0;
  totals.predictionTop3Rate =
    totals.predictionRoundCount > 0
      ? roundTo(totals.predictionPodiumCount / totals.predictionRoundCount)
      : 0;
  totals.avgPointsPerRace =
    totals.raceCount > 0 ? roundTo(totals.totalPoints / totals.raceCount) : 0;
  totals.avgPredictionPointsPerRound =
    totals.predictionRoundCount > 0
      ? roundTo(totals.predictionPoints / totals.predictionRoundCount)
      : 0;
  totals.combinedPoints = totals.totalPoints + totals.predictionPoints;
  totals.avgCombinedPointsPerRace =
    totals.raceCount > 0 ? roundTo(totals.combinedPoints / totals.raceCount) : 0;
  totals.avgSeasonEndRank =
    finalRankCount > 0 ? roundTo(finalRankSum / finalRankCount) : null;
  totals.avgCombinedSeasonEndRank =
    finalCombinedRankCount > 0
      ? roundTo(finalCombinedRankSum / finalCombinedRankCount)
      : null;

  return totals;
};

const computeUserStatsPayload = async ({ userId, completedOnly }) => {
  const seasonDocs = await Season.find({})
    .select("name eventDate participants isCurrent isCompleted")
    .lean();

  const relevantSeasons = selectCompletedSeasons(seasonDocs, completedOnly).sort(
    (a, b) => {
      const dateA = a.eventDate ? new Date(a.eventDate).getTime() : 0;
      const dateB = b.eventDate ? new Date(b.eventDate).getTime() : 0;
      if (dateA !== dateB) return dateA - dateB;
      return String(a._id).localeCompare(String(b._id));
    },
  );

  if (relevantSeasons.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      completedOnly,
      seasons: [],
      overall: buildOverallStats([]),
    };
  }

  const seasonIds = relevantSeasons.map((season) => season._id);
  const [raceDocs, predictionDataBySeason] = await Promise.all([
    Race.find({ season: { $in: seasonIds } })
      .select("name season results")
      .lean(),
    collectPublishedPredictionData(seasonIds),
  ]);

  const racesBySeason = new Map();
  raceDocs.forEach((race) => {
    const seasonId = toIdString(race.season);
    if (!seasonId) return;
    if (!racesBySeason.has(seasonId)) {
      racesBySeason.set(seasonId, []);
    }
    racesBySeason.get(seasonId).push(race);
  });

  const seasons = relevantSeasons.map((season) => {
    const seasonId = toIdString(season._id);
    const seasonRaces = (racesBySeason.get(seasonId) || []).sort(sortByObjectIdAsc);
    const participantIds = (season.participants || [])
      .map(toIdString)
      .filter(Boolean);
    const isAssigned = participantIds.includes(userId);

    if (!isAssigned) {
      return buildNotParticipatedSeasonStats({ season, races: seasonRaces });
    }

    const seasonPredictionData = predictionDataBySeason.get(seasonId) || null;

    return buildSeasonStatsForUser({
      season,
      races: seasonRaces,
      userId,
      participantIds,
      predictionData: seasonPredictionData,
    });
  });

  return {
    generatedAt: new Date().toISOString(),
    completedOnly,
    seasons,
    overall: buildOverallStats(seasons),
  };
};

const sortByDisplayName = (a, b) =>
  a.displayName.localeCompare(b.displayName, "de-CH");

const buildDisplayName = (userDoc) => {
  const realname =
    typeof userDoc?.realname === "string" ? userDoc.realname.trim() : "";
  if (realname) return realname;
  const username =
    typeof userDoc?.username === "string" ? userDoc.username.trim() : "";
  return username || "Unbekannt";
};

const withSeasonFilter = (statsPayload, seasonId) => {
  const seasons = Array.isArray(statsPayload?.seasons) ? statsPayload.seasons : [];
  const filteredSeasons =
    !seasonId || seasonId === "all"
      ? seasons
      : seasons.filter((season) => season.seasonId === seasonId);

  return {
    ...statsPayload,
    seasons: filteredSeasons,
    overall: buildOverallStats(filteredSeasons),
  };
};

export const getUserStatsPayload = async ({
  userId,
  completedOnly = true,
  useCache = true,
  seasonId = null,
}) => {
  const normalizedUserId = toIdString(userId);
  const revision = await getCurrentStatsRevision();

  if (useCache) {
    const cached = await UserStatsCache.findOne({
      user: normalizedUserId,
      completedOnly,
    }).lean();

    if (cached?.revision === revision && cached.payload) {
      return {
        revision,
        cacheHit: true,
        stats: withSeasonFilter(cached.payload, seasonId),
      };
    }
  }

  const payload = await computeUserStatsPayload({
    userId: normalizedUserId,
    completedOnly,
  });

  if (useCache) {
    await UserStatsCache.findOneAndUpdate(
      { user: normalizedUserId, completedOnly },
      { revision, payload },
      { upsert: true, new: true },
    );
  }

  return {
    revision,
    cacheHit: false,
    stats: withSeasonFilter(payload, seasonId),
  };
};

export const getGlobalStatsOverview = async ({ completedOnly = true } = {}) => {
  const seasonQuery = completedOnly ? { isCompleted: true } : {};
  const seasonDocs = await Season.find(seasonQuery).select("participants").lean();

  const completedSeasonsCount = seasonDocs.length;
  const participantIdSet = new Set();
  let participantAssignmentsTotal = 0;

  seasonDocs.forEach((season) => {
    const participantIds = Array.isArray(season?.participants)
      ? season.participants.map(toIdString).filter(Boolean)
      : [];
    participantAssignmentsTotal += participantIds.length;
    participantIds.forEach((participantId) => participantIdSet.add(participantId));
  });

  const participantIds = [...participantIdSet];
  const avgPlayersPerSeason =
    completedSeasonsCount > 0
      ? roundTo(participantAssignmentsTotal / completedSeasonsCount, 2)
      : 0;

  if (participantIds.length === 0) {
    return {
      completedOnly,
      completedSeasonsCount,
      avgPlayersPerSeason,
      mostPointsPlayer: null,
      leastPointsPlayer: null,
    };
  }

  const objectParticipantIds = participantIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (objectParticipantIds.length === 0) {
    return {
      completedOnly,
      completedSeasonsCount,
      avgPlayersPerSeason,
      mostPointsPlayer: null,
      leastPointsPlayer: null,
    };
  }

  const totalsAggregation = await Race.aggregate([
    { $match: { season: { $in: seasonDocs.map((season) => season._id) } } },
    { $unwind: "$results" },
    {
      $group: {
        _id: "$results.user",
        totalPoints: { $sum: { $ifNull: ["$results.pointsEarned", 0] } },
      },
    },
  ]);

  const totalsMap = new Map();
  totalsAggregation.forEach((entry) => {
    if (!entry?._id) return;
    totalsMap.set(toIdString(entry._id), Number(entry.totalPoints) || 0);
  });

  const userDocs = await User.find({ _id: { $in: objectParticipantIds } })
    .select("username realname")
    .lean();

  const normalizedPlayers = userDocs
    .map((userDoc) => {
      const userId = toIdString(userDoc?._id);
      return {
        userId,
        displayName: buildDisplayName(userDoc),
        totalPoints: totalsMap.get(userId) || 0,
      };
    })
    .sort(sortByDisplayName);

  if (normalizedPlayers.length === 0) {
    return {
      completedOnly,
      completedSeasonsCount,
      avgPlayersPerSeason,
      mostPointsPlayer: null,
      leastPointsPlayer: null,
    };
  }

  const mostPointsPlayer = [...normalizedPlayers].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    return sortByDisplayName(a, b);
  })[0];

  const leastPointsPlayer = [...normalizedPlayers].sort((a, b) => {
    if (a.totalPoints !== b.totalPoints) {
      return a.totalPoints - b.totalPoints;
    }
    return sortByDisplayName(a, b);
  })[0];

  return {
    completedOnly,
    completedSeasonsCount,
    avgPlayersPerSeason,
    mostPointsPlayer,
    leastPointsPlayer,
  };
};
