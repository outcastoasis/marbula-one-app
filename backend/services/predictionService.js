import crypto from "crypto";
import mongoose from "mongoose";
import PredictionRound from "../models/PredictionRound.js";
import PredictionEntry from "../models/PredictionEntry.js";
import PredictionScore from "../models/PredictionScore.js";
import Race from "../models/Race.js";
import Season from "../models/Season.js";
import UserSeasonTeam from "../models/UserSeasonTeam.js";

const ROUND_STATUSES = ["draft", "open", "locked", "scored", "published"];
const ALLOWED_TRANSITIONS = {
  draft: new Set(["open"]),
  open: new Set(["locked"]),
  locked: new Set(["scored"]),
  scored: new Set(["published"]),
};
const REOPENABLE_STATUSES = new Set(["locked", "scored", "published"]);

const toIdString = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  if (typeof value === "object" && value._id) return toIdString(value._id);
  return String(value);
};

const buildWriteOptions = (session) => (session ? { session } : {});

const toObjectIdOrNull = (value) => {
  const stringId = toIdString(value);
  if (!stringId || !mongoose.Types.ObjectId.isValid(stringId)) {
    return null;
  }
  return new mongoose.Types.ObjectId(stringId);
};

const ensureObjectId = (value, label) => {
  const objectId = toObjectIdOrNull(value);
  if (!objectId) {
    throw new PredictionServiceError(`Ungültige ${label}.`, 400);
  }
  return objectId;
};

const ensureRoundStatus = (status) => {
  if (!ROUND_STATUSES.includes(status)) {
    throw new PredictionServiceError("Ungültiger Status.", 400);
  }
};

const normalizeRaceResults = (results) =>
  (Array.isArray(results) ? results : [])
    .map((result) => ({
      userId: toIdString(result?.user),
      pointsEarned: Number(result?.pointsEarned) || 0,
    }))
    .filter((result) => Boolean(result.userId))
    .sort(
      (a, b) =>
        a.userId.localeCompare(b.userId) || a.pointsEarned - b.pointsEarned,
    );

const roundToTwoDecimals = (value) =>
  Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100;

const buildRankMap = (scores) => {
  const sorted = [...scores].sort((a, b) => {
    if ((b.total || 0) !== (a.total || 0)) {
      return (b.total || 0) - (a.total || 0);
    }
    return toIdString(a.userId).localeCompare(toIdString(b.userId));
  });

  const rankMap = new Map();
  let rank = 1;
  sorted.forEach((score, index) => {
    if (index > 0 && (score.total || 0) < (sorted[index - 1].total || 0)) {
      rank = index + 1;
    }
    rankMap.set(toIdString(score.userId), rank);
  });

  return rankMap;
};

const isDuplicateKeyError = (error) => error?.code === 11000;

const assertRoundVisibleForUser = async ({ round, userId }) => {
  if (round.status === "draft") {
    throw new PredictionServiceError("Prediction-Runde nicht gefunden.", 404);
  }

  const season = await Season.findById(round.season).select("participants");
  if (!season) {
    throw new PredictionServiceError("Season nicht gefunden.", 404);
  }

  const participantIds = new Set(
    (season.participants || []).map((participant) => toIdString(participant)),
  );

  if (!participantIds.has(toIdString(userId))) {
    throw new PredictionServiceError(
      "Du bist in dieser Season nicht als Teilnehmer hinterlegt.",
      403,
    );
  }
};

const validatePicks = ({ picks, seasonTeamIds }) => {
  const pickFields = ["p1", "p2", "p3", "lastPlace"];
  if (!picks || typeof picks !== "object") {
    throw new PredictionServiceError("Tipps fehlen oder sind ungültig.", 400);
  }

  const normalizedPicks = {};
  pickFields.forEach((field) => {
    normalizedPicks[field] = ensureObjectId(
      picks[field],
      `Team-ID für ${field}`,
    );
  });

  const uniqueTeamIds = new Set(
    pickFields.map((field) => normalizedPicks[field].toString()),
  );
  if (uniqueTeamIds.size !== pickFields.length) {
    throw new PredictionServiceError(
      "Ein Team darf in einem Tipp nur einmal ausgewählt werden.",
      400,
    );
  }

  for (const field of pickFields) {
    if (!seasonTeamIds.has(normalizedPicks[field].toString())) {
      throw new PredictionServiceError(
        `Das gewählte Team für ${field} ist in dieser Season nicht verfügbar.`,
        400,
      );
    }
  }

  return normalizedPicks;
};

const buildActualSnapshot = ({ seasonParticipants, userToTeamMap, race }) => {
  const racePointsByUser = new Map();
  (race.results || []).forEach((result) => {
    const userId = toIdString(result?.user);
    if (!userId) return;
    racePointsByUser.set(userId, Number(result?.pointsEarned) || 0);
  });

  const rankingRows = seasonParticipants
    .map((userId) => ({
      userId,
      teamId: userToTeamMap.get(userId) || null,
      points: racePointsByUser.get(userId) || 0,
    }))
    .filter((row) => Boolean(row.teamId))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.teamId.localeCompare(b.teamId);
    });

  const top3 = rankingRows.slice(0, 3).map((row) => row.teamId);
  const lastPlace =
    rankingRows.length > 0 ? rankingRows[rankingRows.length - 1].teamId : null;
  return {
    p1: top3[0] || null,
    p2: top3[1] || null,
    p3: top3[2] || null,
    lastPlace,
    top3Set: new Set(top3.filter(Boolean)),
  };
};

export const buildRaceResultsHash = (raceResults) => {
  const normalized = normalizeRaceResults(raceResults);
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(normalized))
    .digest("hex");
};

export const calculateRoundScore = ({ entry, actual, config }) => {
  const scoringConfig = {
    exactPositionPoints: Number(config?.exactPositionPoints ?? 6),
    top3AnyPositionPoints: Number(config?.top3AnyPositionPoints ?? 3),
    exactLastPlacePoints: Number(config?.exactLastPlacePoints ?? 4),
  };

  const predicted = {
    p1: toObjectIdOrNull(entry?.picks?.p1),
    p2: toObjectIdOrNull(entry?.picks?.p2),
    p3: toObjectIdOrNull(entry?.picks?.p3),
    lastPlace: toObjectIdOrNull(entry?.picks?.lastPlace),
  };

  if (!entry) {
    return {
      total: 0,
      breakdown: [],
      predicted,
    };
  }

  const breakdown = [];
  let total = 0;
  const addBreakdown = (code, label, points, details = null) => {
    if (!points) return;
    total += points;
    breakdown.push({
      code,
      label,
      points: roundToTwoDecimals(points),
      details,
    });
  };

  ["p1", "p2", "p3"].forEach((field) => {
    const predictedId = toIdString(predicted[field]);
    const actualId = toIdString(actual[field]);
    if (!predictedId) return;

    if (predictedId === actualId) {
      addBreakdown(
        `exact_${field}`,
        `Exakte Position ${field.toUpperCase()}`,
        scoringConfig.exactPositionPoints,
      );
      return;
    }

    if (actual.top3Set.has(predictedId)) {
      addBreakdown(
        `top3_${field}`,
        `Team in Top 3 (${field.toUpperCase()})`,
        scoringConfig.top3AnyPositionPoints,
      );
    }
  });

  if (
    toIdString(predicted.lastPlace) &&
    toIdString(predicted.lastPlace) === toIdString(actual.lastPlace)
  ) {
    addBreakdown(
      "exact_last_place",
      "Letzter Platz exakt",
      scoringConfig.exactLastPlacePoints,
    );
  }

  return {
    total: roundToTwoDecimals(total),
    breakdown,
    predicted,
  };
};

export class PredictionServiceError extends Error {
  constructor(message, statusCode = 400, details = null) {
    super(message);
    this.name = "PredictionServiceError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const createRound = async ({
  seasonId,
  raceId,
  scoringConfig = {},
  createdBy = null,
}) => {
  const normalizedSeasonId = ensureObjectId(seasonId, "Season-ID");
  const normalizedRaceId = ensureObjectId(raceId, "Race-ID");
  const createdById = createdBy ? ensureObjectId(createdBy, "Benutzer-ID") : null;

  const [season, race] = await Promise.all([
    Season.findById(normalizedSeasonId).select("_id"),
    Race.findById(normalizedRaceId).select("_id season"),
  ]);

  if (!season) {
    throw new PredictionServiceError("Season nicht gefunden.", 404);
  }
  if (!race) {
    throw new PredictionServiceError("Rennen nicht gefunden.", 404);
  }
  if (toIdString(race.season) !== normalizedSeasonId.toString()) {
    throw new PredictionServiceError(
      "Das Rennen gehört nicht zur gewählten Season.",
      400,
    );
  }

  try {
    return await PredictionRound.create({
      season: normalizedSeasonId,
      race: normalizedRaceId,
      scoringConfig,
      createdBy: createdById,
      updatedBy: createdById,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new PredictionServiceError(
        "Für diese Season und dieses Rennen existiert bereits eine Prediction-Runde.",
        409,
      );
    }
    throw error;
  }
};

export const listRoundsForAdmin = async ({ filters = {} } = {}) => {
  const query = {};

  if (filters.seasonId) {
    query.season = ensureObjectId(filters.seasonId, "Season-ID");
  }
  if (filters.raceId) {
    query.race = ensureObjectId(filters.raceId, "Race-ID");
  }
  if (filters.status) {
    ensureRoundStatus(filters.status);
    query.status = filters.status;
  }

  const rounds = await PredictionRound.find(query)
    .populate("season", "name eventDate")
    .populate("race", "name")
    .sort({ createdAt: -1, _id: -1 });

  const roundIds = rounds.map((round) => round._id);
  if (roundIds.length === 0) {
    return [];
  }

  const [entryCounts, scoreCounts] = await Promise.all([
    PredictionEntry.aggregate([
      { $match: { roundId: { $in: roundIds } } },
      { $group: { _id: "$roundId", count: { $sum: 1 } } },
    ]),
    PredictionScore.aggregate([
      { $match: { roundId: { $in: roundIds } } },
      { $group: { _id: "$roundId", count: { $sum: 1 } } },
    ]),
  ]);

  const entryCountMap = new Map(
    entryCounts.map((entry) => [toIdString(entry._id), entry.count]),
  );
  const scoreCountMap = new Map(
    scoreCounts.map((entry) => [toIdString(entry._id), entry.count]),
  );

  return rounds.map((round) => ({
    ...round.toObject(),
    metrics: {
      entries: entryCountMap.get(round._id.toString()) || 0,
      scores: scoreCountMap.get(round._id.toString()) || 0,
    },
  }));
};

export const listRoundsForUser = async ({ userId, filters = {} }) => {
  const normalizedUserId = ensureObjectId(userId, "Benutzer-ID");
  const query = {
    status: { $ne: "draft" },
  };

  if (filters.status) {
    ensureRoundStatus(filters.status);
    if (filters.status === "draft") {
      throw new PredictionServiceError(
        "Draft-Runden sind nur für Admins sichtbar.",
        403,
      );
    }
    query.status = filters.status;
  }

  if (filters.seasonId) {
    query.season = ensureObjectId(filters.seasonId, "Season-ID");
  }
  if (filters.raceId) {
    query.race = ensureObjectId(filters.raceId, "Race-ID");
  }

  const seasons = await Season.find({ participants: normalizedUserId }).select("_id");
  const seasonIds = seasons.map((season) => season._id);
  if (seasonIds.length === 0) {
    return [];
  }

  query.season = query.season
    ? { $in: seasonIds.filter((id) => id.equals(query.season)) }
    : { $in: seasonIds };

  const rounds = await PredictionRound.find(query)
    .populate("season", "name eventDate")
    .populate("race", "name")
    .sort({ createdAt: -1, _id: -1 })
    .lean();

  const roundIds = rounds.map((round) => round._id);
  if (roundIds.length === 0) {
    return [];
  }

  const [entries, scores] = await Promise.all([
    PredictionEntry.find({ roundId: { $in: roundIds }, userId: normalizedUserId })
      .populate("picks.p1 picks.p2 picks.p3 picks.lastPlace", "name")
      .lean(),
    PredictionScore.find({ roundId: { $in: roundIds }, userId: normalizedUserId })
      .lean(),
  ]);

  const entryByRoundId = new Map(
    entries.map((entry) => [toIdString(entry.roundId), entry]),
  );
  const scoreByRoundId = new Map(
    scores.map((score) => [toIdString(score.roundId), score]),
  );

  return rounds.map((round) => ({
    ...round,
    myEntry: entryByRoundId.get(toIdString(round._id)) || null,
    myScore: scoreByRoundId.get(toIdString(round._id)) || null,
  }));
};

export const getRoundDetailsForAdmin = async ({ roundId }) => {
  const normalizedRoundId = ensureObjectId(roundId, "Round-ID");
  const round = await PredictionRound.findById(normalizedRoundId)
    .populate("season", "name eventDate participants teams")
    .populate("race", "name season")
    .populate("createdBy", "username realname")
    .populate("updatedBy", "username realname")
    .populate("statusTransitions.changedBy", "username realname");

  if (!round) {
    throw new PredictionServiceError("Prediction-Runde nicht gefunden.", 404);
  }

  const [entries, scores] = await Promise.all([
    PredictionEntry.find({ roundId: normalizedRoundId })
      .populate("userId", "username realname")
      .populate("picks.p1 picks.p2 picks.p3 picks.lastPlace", "name")
      .sort({ submittedAt: 1, _id: 1 }),
    PredictionScore.find({ roundId: normalizedRoundId })
      .populate("userId", "username realname")
      .populate("overrideBy", "username realname")
      .populate("predicted.p1 predicted.p2 predicted.p3 predicted.lastPlace", "name")
      .populate("actual.p1 actual.p2 actual.p3 actual.lastPlace", "name")
      .sort({ total: -1, userId: 1 }),
  ]);

  return {
    round,
    entries,
    scores,
  };
};

export const getRoundDetailsForUser = async ({ roundId, userId }) => {
  const normalizedRoundId = ensureObjectId(roundId, "Round-ID");
  const normalizedUserId = ensureObjectId(userId, "Benutzer-ID");

  const round = await PredictionRound.findById(normalizedRoundId)
    .populate("season", "name eventDate")
    .populate("race", "name season");

  if (!round) {
    throw new PredictionServiceError("Prediction-Runde nicht gefunden.", 404);
  }
  await assertRoundVisibleForUser({ round, userId: normalizedUserId });

  const [entry, score] = await Promise.all([
    PredictionEntry.findOne({
      roundId: normalizedRoundId,
      userId: normalizedUserId,
    })
      .populate("picks.p1 picks.p2 picks.p3 picks.lastPlace", "name")
      .lean(),
    PredictionScore.findOne({
      roundId: normalizedRoundId,
      userId: normalizedUserId,
    }).lean(),
  ]);

  let placement = null;
  if (score) {
    const allScores = await PredictionScore.find({ roundId: normalizedRoundId })
      .select("userId total")
      .lean();
    const rankMap = buildRankMap(allScores);
    placement = rankMap.get(normalizedUserId.toString()) || null;
  }

  return {
    round,
    myEntry: entry || null,
    myScore: score || null,
    myPlacement: placement,
  };
};

export const upsertUserEntry = async ({ roundId, userId, picks }) => {
  const normalizedRoundId = ensureObjectId(roundId, "Round-ID");
  const normalizedUserId = ensureObjectId(userId, "Benutzer-ID");

  const round = await PredictionRound.findById(normalizedRoundId).select(
    "season status",
  );
  if (!round) {
    throw new PredictionServiceError("Prediction-Runde nicht gefunden.", 404);
  }

  if (round.status !== "open") {
    throw new PredictionServiceError(
      "Tipps können nur im Status 'open' erstellt oder geändert werden.",
      409,
    );
  }

  const season = await Season.findById(round.season).select("participants teams");
  if (!season) {
    throw new PredictionServiceError("Season nicht gefunden.", 404);
  }

  const participantIds = new Set(
    (season.participants || []).map((participant) => toIdString(participant)),
  );
  if (!participantIds.has(normalizedUserId.toString())) {
    throw new PredictionServiceError(
      "Du bist in dieser Season nicht als Teilnehmer hinterlegt.",
      403,
    );
  }

  const assignment = await UserSeasonTeam.findOne({
    user: normalizedUserId,
    season: season._id,
  }).select("_id");
  if (!assignment) {
    throw new PredictionServiceError(
      "Für diese Season ist kein Team für dich hinterlegt.",
      403,
    );
  }

  const seasonTeamIds = new Set((season.teams || []).map((team) => toIdString(team)));
  const normalizedPicks = validatePicks({
    picks,
    seasonTeamIds,
  });

  try {
    return await PredictionEntry.findOneAndUpdate(
      { roundId: normalizedRoundId, userId: normalizedUserId },
      {
        $set: {
          picks: normalizedPicks,
          submittedAt: new Date(),
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      },
    );
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new PredictionServiceError(
        "Für diese Runde existiert bereits ein Tipp des Benutzers.",
        409,
      );
    }
    throw error;
  }
};

export const transitionRoundStatus = async ({
  roundId,
  toStatus,
  changedBy = null,
  reason = null,
  trigger = "manual",
}) => {
  const normalizedRoundId = ensureObjectId(roundId, "Round-ID");
  ensureRoundStatus(toStatus);
  const changedById = changedBy ? ensureObjectId(changedBy, "Benutzer-ID") : null;

  const round = await PredictionRound.findById(normalizedRoundId);
  if (!round) {
    throw new PredictionServiceError("Prediction-Runde nicht gefunden.", 404);
  }

  const fromStatus = round.status;
  if (fromStatus === toStatus) {
    return round;
  }

  const isStandardTransition = ALLOWED_TRANSITIONS[fromStatus]?.has(toStatus);
  const isReopenTransition =
    toStatus === "open" && REOPENABLE_STATUSES.has(fromStatus);

  if (!isStandardTransition && !isReopenTransition) {
    throw new PredictionServiceError(
      `Ungültiger Statuswechsel von '${fromStatus}' zu '${toStatus}'.`,
      409,
    );
  }

  if (isReopenTransition && !String(reason || "").trim()) {
    throw new PredictionServiceError(
      "Für das Wiederöffnen ist ein Grund erforderlich.",
      400,
    );
  }

  const now = new Date();
  round.status = toStatus;
  round.updatedBy = changedById;

  if (toStatus === "open") round.openedAt = now;
  if (toStatus === "locked") round.lockedAt = now;
  if (toStatus === "scored") round.scoredAt = now;
  if (toStatus === "published") {
    round.publishedAt = now;
    round.requiresReview = false;
  }

  round.statusTransitions.push({
    fromStatus,
    toStatus,
    changedBy: changedById,
    changedAt: now,
    reason: reason || null,
    trigger,
  });

  await round.save();
  return round;
};

export const scoreRoundFromRaceResults = async ({
  roundId,
  generatedBy = null,
  trigger = "manual",
  force = false,
  preserveOverrides = true,
  session = null,
}) => {
  const normalizedRoundId = ensureObjectId(roundId, "Round-ID");
  const generatedById = generatedBy ? ensureObjectId(generatedBy, "Benutzer-ID") : null;

  const roundQuery = PredictionRound.findById(normalizedRoundId);
  if (session) roundQuery.session(session);
  const round = await roundQuery;
  if (!round) {
    throw new PredictionServiceError("Prediction-Runde nicht gefunden.", 404);
  }

  if (!["locked", "scored", "published"].includes(round.status)) {
    throw new PredictionServiceError(
      "Scoring ist nur für Runden in 'locked', 'scored' oder 'published' erlaubt.",
      409,
    );
  }
  if (round.status === "published" && !force) {
    throw new PredictionServiceError(
      "Veröffentlichte Runden dürfen nicht still überschrieben werden. Nutze 'rescore-from-race'.",
      409,
    );
  }

  const seasonQuery = Season.findById(round.season).select("participants");
  const raceQuery = Race.findById(round.race).select("season results");
  if (session) {
    seasonQuery.session(session);
    raceQuery.session(session);
  }

  const [season, race] = await Promise.all([seasonQuery, raceQuery]);
  if (!season) {
    throw new PredictionServiceError("Season nicht gefunden.", 404);
  }
  if (!race) {
    throw new PredictionServiceError("Rennen nicht gefunden.", 404);
  }
  if (toIdString(race.season) !== toIdString(round.season)) {
    throw new PredictionServiceError(
      "Rennen und Prediction-Runde gehören nicht zur selben Season.",
      409,
    );
  }

  const raceResultsHash = buildRaceResultsHash(race.results);
  const canSkip =
    !force &&
    round.status === "scored" &&
    round.lastRaceResultsHash &&
    round.lastRaceResultsHash === raceResultsHash;

  if (canSkip) {
    return {
      skipped: true,
      round,
      raceResultsHash,
      updatedScores: 0,
    };
  }

  const seasonParticipants = [
    ...new Set(
      (season.participants || []).map((participant) => toIdString(participant)),
    ),
  ].filter(Boolean);

  const teamAssignmentQuery = UserSeasonTeam.find({
    season: season._id,
    user: { $in: seasonParticipants.map((id) => new mongoose.Types.ObjectId(id)) },
  }).select("user team");
  if (session) teamAssignmentQuery.session(session);
  const teamAssignments = await teamAssignmentQuery;

  const userToTeamMap = new Map(
    teamAssignments
      .map((assignment) => [toIdString(assignment.user), toIdString(assignment.team)])
      .filter((entry) => Boolean(entry[0]) && Boolean(entry[1])),
  );

  const actual = buildActualSnapshot({ seasonParticipants, userToTeamMap, race });

  const entriesQuery = PredictionEntry.find({ roundId: normalizedRoundId }).select(
    "userId picks submittedAt",
  );
  const scoresQuery = PredictionScore.find({ roundId: normalizedRoundId });
  if (session) {
    entriesQuery.session(session);
    scoresQuery.session(session);
  }

  const [entries, existingScores] = await Promise.all([entriesQuery, scoresQuery]);
  const entryByUserId = new Map(
    entries.map((entry) => [toIdString(entry.userId), entry]),
  );
  const existingScoreByUserId = new Map(
    existingScores.map((score) => [toIdString(score.userId), score]),
  );

  const now = new Date();
  const bulkOperations = [];
  const preservedOverrides = [];

  seasonParticipants.forEach((participantId) => {
    const entry = entryByUserId.get(participantId) || null;
    const existingScore = existingScoreByUserId.get(participantId) || null;
    const calculated = calculateRoundScore({
      entry,
      actual,
      config: round.scoringConfig,
    });

    const preserveManualOverride =
      preserveOverrides && existingScore?.isOverridden === true;
    if (preserveManualOverride) {
      preservedOverrides.push(participantId);
    }

    const nextTotal = preserveManualOverride ? existingScore.total : calculated.total;
    const nextBreakdown = preserveManualOverride
      ? existingScore.breakdown || []
      : calculated.breakdown;

    bulkOperations.push({
      updateOne: {
        filter: {
          roundId: normalizedRoundId,
          userId: new mongoose.Types.ObjectId(participantId),
        },
        update: {
          $set: {
            total: roundToTwoDecimals(nextTotal),
            breakdown: nextBreakdown,
            predicted: calculated.predicted,
            actual: {
              p1: toObjectIdOrNull(actual.p1),
              p2: toObjectIdOrNull(actual.p2),
              p3: toObjectIdOrNull(actual.p3),
              lastPlace: toObjectIdOrNull(actual.lastPlace),
            },
            generatedFrom: {
              raceId: race._id,
              raceResultsHash,
              generatedAt: now,
              trigger,
              generatedBy: generatedById,
            },
            isOverridden: preserveManualOverride
              ? true
              : existingScore?.isOverridden === true,
            overrideReason: preserveManualOverride
              ? existingScore.overrideReason
              : existingScore?.overrideReason || null,
            overrideBy: preserveManualOverride
              ? existingScore.overrideBy
              : existingScore?.overrideBy || null,
            overrideAt: preserveManualOverride
              ? existingScore.overrideAt
              : existingScore?.overrideAt || null,
          },
          $setOnInsert: {
            roundId: normalizedRoundId,
            userId: new mongoose.Types.ObjectId(participantId),
          },
        },
        upsert: true,
      },
    });
  });

  if (bulkOperations.length > 0) {
    await PredictionScore.bulkWrite(bulkOperations, buildWriteOptions(session));
  }

  const previousStatus = round.status;
  if (previousStatus !== "scored") {
    round.status = "scored";
    round.statusTransitions.push({
      fromStatus: previousStatus,
      toStatus: "scored",
      changedBy: generatedById,
      changedAt: now,
      reason:
        previousStatus === "published"
          ? "Round wurde zur Neu-Berechnung wieder auf scored gesetzt."
          : "Round wurde automatisch gescored.",
      trigger,
    });
  } else {
    round.statusTransitions.push({
      fromStatus: "scored",
      toStatus: "scored",
      changedBy: generatedById,
      changedAt: now,
      reason: "Round wurde neu gescored.",
      trigger,
    });
  }

  round.scoredAt = round.scoredAt || now;
  round.lastScoredAt = now;
  round.lastRaceResultsHash = raceResultsHash;
  round.updatedBy = generatedById;
  round.requiresReview = preservedOverrides.length > 0;
  await round.save(buildWriteOptions(session));

  return {
    skipped: false,
    raceResultsHash,
    updatedScores: bulkOperations.length,
    preservedOverrides,
    round,
  };
};

export const publishRound = async ({ roundId, publishedBy = null }) => {
  const normalizedRoundId = ensureObjectId(roundId, "Round-ID");
  const publishedById = publishedBy
    ? ensureObjectId(publishedBy, "Benutzer-ID")
    : null;

  const round = await PredictionRound.findById(normalizedRoundId);
  if (!round) {
    throw new PredictionServiceError("Prediction-Runde nicht gefunden.", 404);
  }
  if (round.status !== "scored") {
    throw new PredictionServiceError(
      "Nur Runden im Status 'scored' können veröffentlicht werden.",
      409,
    );
  }

  const now = new Date();
  round.status = "published";
  round.publishedAt = now;
  round.updatedBy = publishedById;
  round.requiresReview = false;
  round.statusTransitions.push({
    fromStatus: "scored",
    toStatus: "published",
    changedBy: publishedById,
    changedAt: now,
    reason: "Prediction-Runde veröffentlicht.",
    trigger: "manual",
  });

  await round.save();
  return round;
};

export const overrideUserScore = async ({
  roundId,
  userId,
  total,
  reason,
  overrideBy,
}) => {
  const normalizedRoundId = ensureObjectId(roundId, "Round-ID");
  const normalizedUserId = ensureObjectId(userId, "Benutzer-ID");
  const normalizedOverrideBy = overrideBy
    ? ensureObjectId(overrideBy, "Benutzer-ID")
    : null;

  const numericTotal = Number(total);
  if (!Number.isFinite(numericTotal)) {
    throw new PredictionServiceError("Score muss eine gültige Zahl sein.", 400);
  }
  if (!String(reason || "").trim()) {
    throw new PredictionServiceError(
      "Für ein Override ist eine Begründung erforderlich.",
      400,
    );
  }

  const round = await PredictionRound.findById(normalizedRoundId).select("status");
  if (!round) {
    throw new PredictionServiceError("Prediction-Runde nicht gefunden.", 404);
  }
  if (!["scored", "published"].includes(round.status)) {
    throw new PredictionServiceError(
      "Overrides sind nur für gescorte oder veröffentlichte Runden erlaubt.",
      409,
    );
  }

  const score = await PredictionScore.findOne({
    roundId: normalizedRoundId,
    userId: normalizedUserId,
  });
  if (!score) {
    throw new PredictionServiceError(
      "Für diesen Benutzer existiert noch kein Score in der Runde.",
      404,
    );
  }

  score.total = roundToTwoDecimals(numericTotal);
  score.isOverridden = true;
  score.overrideReason = String(reason).trim();
  score.overrideBy = normalizedOverrideBy;
  score.overrideAt = new Date();
  await score.save();

  return score;
};

export const clearUserScoreOverride = async ({
  roundId,
  userId,
  clearedBy = null,
}) => {
  const normalizedRoundId = ensureObjectId(roundId, "Round-ID");
  const normalizedUserId = ensureObjectId(userId, "Benutzer-ID");
  const normalizedClearedBy = clearedBy
    ? ensureObjectId(clearedBy, "Benutzer-ID")
    : null;

  const round = await PredictionRound.findById(normalizedRoundId).select("status");
  if (!round) {
    throw new PredictionServiceError("Prediction-Runde nicht gefunden.", 404);
  }
  if (!["scored", "published"].includes(round.status)) {
    throw new PredictionServiceError(
      "Overrides kÃ¶nnen nur bei gescorten oder verÃ¶ffentlichten Runden entfernt werden.",
      409,
    );
  }

  const score = await PredictionScore.findOne({
    roundId: normalizedRoundId,
    userId: normalizedUserId,
  });
  if (!score) {
    throw new PredictionServiceError(
      "FÃ¼r diesen Benutzer existiert noch kein Score in der Runde.",
      404,
    );
  }
  if (!score.isOverridden) {
    throw new PredictionServiceError(
      "FÃ¼r diesen Benutzer ist kein manueller Override gesetzt.",
      409,
    );
  }

  score.isOverridden = false;
  score.overrideReason = null;
  score.overrideBy = null;
  score.overrideAt = null;
  await score.save();

  const rescoreResult = await scoreRoundFromRaceResults({
    roundId: normalizedRoundId,
    generatedBy: normalizedClearedBy,
    trigger: "override_clear_recalc",
    force: true,
    preserveOverrides: true,
  });

  return {
    cleared: true,
    rescoreResult,
  };
};

export const syncPredictionsForRace = async ({
  raceId,
  triggerInfo = {},
} = {}) => {
  const normalizedRaceId = ensureObjectId(raceId, "Race-ID");
  const triggeredBy = triggerInfo.triggeredBy
    ? ensureObjectId(triggerInfo.triggeredBy, "Benutzer-ID")
    : null;

  const race = await Race.findById(normalizedRaceId).select("results");
  if (!race) {
    throw new PredictionServiceError("Rennen nicht gefunden.", 404);
  }

  const latestHash = buildRaceResultsHash(race.results);
  const rounds = await PredictionRound.find({
    race: normalizedRaceId,
    status: { $in: ["locked", "scored", "published"] },
  });

  let rescored = 0;
  let reviewFlagged = 0;
  let unchanged = 0;

  for (const round of rounds) {
    const oldHash = round.lastRaceResultsHash || null;
    if (oldHash && oldHash === latestHash) {
      unchanged += 1;
      continue;
    }

    if (round.status === "published") {
      round.requiresReview = true;
      round.updatedBy = triggeredBy;
      round.lastRaceResultsHash = latestHash;
      round.statusTransitions.push({
        fromStatus: "published",
        toStatus: "published",
        changedBy: triggeredBy,
        changedAt: new Date(),
        reason: `Race-Ergebnisse geändert (Hash alt: ${
          oldHash || "leer"
        }, neu: ${latestHash}). Review erforderlich.`,
        trigger: "race_result_update",
      });
      await round.save();
      reviewFlagged += 1;
      continue;
    }

    await scoreRoundFromRaceResults({
      roundId: round._id,
      generatedBy: triggeredBy,
      trigger: "race_result_update",
      force: true,
      preserveOverrides: true,
    });
    rescored += 1;
  }

  return {
    raceId: normalizedRaceId.toString(),
    latestHash,
    roundsTotal: rounds.length,
    rescored,
    reviewFlagged,
    unchanged,
  };
};

export const getUserPredictionHistory = async ({ userId, seasonId = null }) => {
  const normalizedUserId = ensureObjectId(userId, "Benutzer-ID");
  const normalizedSeasonId = seasonId
    ? ensureObjectId(seasonId, "Season-ID")
    : null;

  const seasonQuery = {
    participants: normalizedUserId,
  };
  if (normalizedSeasonId) {
    seasonQuery._id = normalizedSeasonId;
  }

  const seasons = await Season.find(seasonQuery).select("_id");
  const seasonIds = seasons.map((season) => season._id);
  if (seasonIds.length === 0) {
    return {
      rows: [],
      summary: {
        totalRounds: 0,
        totalPoints: 0,
        publishedRounds: 0,
        publishedPoints: 0,
      },
    };
  }

  const rounds = await PredictionRound.find({
    season: { $in: seasonIds },
    status: { $in: ["scored", "published"] },
  })
    .populate("season", "name eventDate")
    .populate("race", "name")
    .sort({ createdAt: -1, _id: -1 })
    .lean();

  const roundIds = rounds.map((round) => round._id);
  if (roundIds.length === 0) {
    return {
      rows: [],
      summary: {
        totalRounds: 0,
        totalPoints: 0,
        publishedRounds: 0,
        publishedPoints: 0,
      },
    };
  }

  const [myScores, allRoundScores] = await Promise.all([
    PredictionScore.find({ roundId: { $in: roundIds }, userId: normalizedUserId })
      .lean(),
    PredictionScore.find({ roundId: { $in: roundIds } })
      .select("roundId userId total")
      .lean(),
  ]);

  const myScoreMap = new Map(
    myScores.map((score) => [toIdString(score.roundId), score]),
  );

  const scoresByRound = new Map();
  allRoundScores.forEach((score) => {
    const key = toIdString(score.roundId);
    if (!scoresByRound.has(key)) scoresByRound.set(key, []);
    scoresByRound.get(key).push(score);
  });

  const rows = rounds
    .map((round) => {
      const roundId = toIdString(round._id);
      const myScore = myScoreMap.get(roundId) || null;
      const rankMap = buildRankMap(scoresByRound.get(roundId) || []);
      const placement = rankMap.get(normalizedUserId.toString()) || null;
      return {
        round,
        score: myScore,
        placement,
      };
    })
    .filter((row) => Boolean(row.score));

  const totalPoints = rows.reduce(
    (sum, row) => sum + (Number(row.score?.total) || 0),
    0,
  );
  const publishedRows = rows.filter((row) => row.round.status === "published");
  const publishedPoints = publishedRows.reduce(
    (sum, row) => sum + (Number(row.score?.total) || 0),
    0,
  );

  return {
    rows,
    summary: {
      totalRounds: rows.length,
      totalPoints: roundToTwoDecimals(totalPoints),
      publishedRounds: publishedRows.length,
      publishedPoints: roundToTwoDecimals(publishedPoints),
    },
  };
};

export const deletePredictionRound = async ({ roundId, deletedBy = null, session = null }) => {
  const normalizedRoundId = ensureObjectId(roundId, "Round-ID");
  if (deletedBy) {
    ensureObjectId(deletedBy, "Benutzer-ID");
  }

  const roundQuery = PredictionRound.findById(normalizedRoundId).select("_id");
  if (session) roundQuery.session(session);
  const round = await roundQuery;
  if (!round) {
    throw new PredictionServiceError("Prediction-Runde nicht gefunden.", 404);
  }

  await PredictionEntry.deleteMany(
    { roundId: normalizedRoundId },
    buildWriteOptions(session),
  );
  await PredictionScore.deleteMany(
    { roundId: normalizedRoundId },
    buildWriteOptions(session),
  );
  await PredictionRound.deleteOne(
    { _id: normalizedRoundId },
    buildWriteOptions(session),
  );

  return { deleted: true, roundId: normalizedRoundId.toString() };
};

export const deletePredictionDataForSeason = async ({ seasonId, session = null }) => {
  const normalizedSeasonId = ensureObjectId(seasonId, "Season-ID");
  const roundIdsQuery = PredictionRound.find({ season: normalizedSeasonId }).select(
    "_id",
  );
  if (session) roundIdsQuery.session(session);
  const rounds = await roundIdsQuery;
  const roundIds = rounds.map((round) => round._id);

  if (roundIds.length > 0) {
    await PredictionEntry.deleteMany(
      { roundId: { $in: roundIds } },
      buildWriteOptions(session),
    );
    await PredictionScore.deleteMany(
      { roundId: { $in: roundIds } },
      buildWriteOptions(session),
    );
  }

  await PredictionRound.deleteMany(
    { season: normalizedSeasonId },
    buildWriteOptions(session),
  );
};

export const deletePredictionDataForRace = async ({ raceId, session = null }) => {
  const normalizedRaceId = ensureObjectId(raceId, "Race-ID");
  const roundIdsQuery = PredictionRound.find({ race: normalizedRaceId }).select("_id");
  if (session) roundIdsQuery.session(session);
  const rounds = await roundIdsQuery;
  const roundIds = rounds.map((round) => round._id);

  if (roundIds.length > 0) {
    await PredictionEntry.deleteMany(
      { roundId: { $in: roundIds } },
      buildWriteOptions(session),
    );
    await PredictionScore.deleteMany(
      { roundId: { $in: roundIds } },
      buildWriteOptions(session),
    );
  }

  await PredictionRound.deleteMany(
    { race: normalizedRaceId },
    buildWriteOptions(session),
  );
};
