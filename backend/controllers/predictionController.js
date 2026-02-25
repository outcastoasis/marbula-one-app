import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
import {
  PredictionServiceError,
  clearUserScoreOverride,
  createRound,
  deletePredictionRound,
  getRoundDetailsForAdmin,
  getRoundDetailsForUser,
  getUserPredictionHistory,
  listRoundsForAdmin,
  listRoundsForUser,
  overrideUserScore,
  publishRound,
  scoreRoundFromRaceResults,
  transitionRoundStatus,
  updateRoundScoringConfig,
  upsertUserEntry,
} from "../services/predictionService.js";

const isObjectIdError = (error) =>
  error?.name === "CastError" ||
  error?.name === "BSONError" ||
  error instanceof mongoose.Error.CastError;

const sendPredictionError = (res, error, fallbackMessage) => {
  if (error instanceof PredictionServiceError) {
    const body = { message: error.message };
    if (error.details) body.details = error.details;
    return res.status(error.statusCode || 400).json(body);
  }

  if (isObjectIdError(error)) {
    return res.status(400).json({ message: "Ungültige ID." });
  }

  if (error?.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }

  console.error(fallbackMessage, error);
  return res.status(500).json({ message: fallbackMessage });
};

const withPredictionHandler = (handler, fallbackMessage) =>
  asyncHandler(async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      sendPredictionError(res, error, fallbackMessage);
    }
  });

export const getRounds = withPredictionHandler(
  async (req, res) => {
    const rounds = await listRoundsForUser({
      userId: req.user?._id,
      filters: {
        seasonId: req.query.seasonId,
        raceId: req.query.raceId,
        status: req.query.status,
      },
    });
    return res.json(rounds);
  },
  "Fehler beim Laden der Prediction-Runden.",
);

export const getRoundById = withPredictionHandler(
  async (req, res) => {
    const details = await getRoundDetailsForUser({
      roundId: req.params.roundId,
      userId: req.user?._id,
    });
    return res.json(details);
  },
  "Fehler beim Laden der Prediction-Runde.",
);

export const putMyEntry = withPredictionHandler(
  async (req, res) => {
    const entry = await upsertUserEntry({
      roundId: req.params.roundId,
      userId: req.user?._id,
      picks: req.body?.picks,
    });
    return res.json(entry);
  },
  "Fehler beim Speichern des Tipps.",
);

export const getMyPredictions = withPredictionHandler(
  async (req, res) => {
    const payload = await getUserPredictionHistory({
      userId: req.user?._id,
      seasonId: req.query.seasonId,
    });
    return res.json(payload);
  },
  "Fehler beim Laden der eigenen Predictions.",
);

export const getAdminRounds = withPredictionHandler(
  async (req, res) => {
    const rounds = await listRoundsForAdmin({
      filters: {
        seasonId: req.query.seasonId,
        raceId: req.query.raceId,
        status: req.query.status,
      },
    });
    return res.json(rounds);
  },
  "Fehler beim Laden der Admin-Prediction-Runden.",
);

export const createAdminRound = withPredictionHandler(
  async (req, res) => {
    const round = await createRound({
      seasonId: req.body?.seasonId,
      raceId: req.body?.raceId,
      scoringConfig: req.body?.scoringConfig || {},
      createdBy: req.user?._id,
    });
    return res.status(201).json(round);
  },
  "Fehler beim Erstellen der Prediction-Runde.",
);

export const getAdminRoundById = withPredictionHandler(
  async (req, res) => {
    const details = await getRoundDetailsForAdmin({
      roundId: req.params.roundId,
    });
    return res.json(details);
  },
  "Fehler beim Laden der Admin-Rundendetails.",
);

export const patchAdminRoundStatus = withPredictionHandler(
  async (req, res) => {
    const round = await transitionRoundStatus({
      roundId: req.params.roundId,
      toStatus: req.body?.toStatus || req.body?.status,
      reason: req.body?.reason || null,
      trigger: req.body?.trigger || "manual_admin",
      changedBy: req.user?._id,
    });
    return res.json(round);
  },
  "Fehler beim Wechseln des Round-Status.",
);

export const patchAdminRoundScoringConfig = withPredictionHandler(
  async (req, res) => {
    const result = await updateRoundScoringConfig({
      roundId: req.params.roundId,
      scoringConfig: req.body?.scoringConfig || {},
      updatedBy: req.user?._id,
    });
    return res.json(result);
  },
  "Fehler beim Speichern der Punkteverteilung.",
);

export const postAdminScoreRound = withPredictionHandler(
  async (req, res) => {
    const result = await scoreRoundFromRaceResults({
      roundId: req.params.roundId,
      generatedBy: req.user?._id,
      trigger: req.body?.trigger || "manual",
      force: false,
    });
    return res.json(result);
  },
  "Fehler beim Scoring der Runde.",
);

export const postAdminPublishRound = withPredictionHandler(
  async (req, res) => {
    const round = await publishRound({
      roundId: req.params.roundId,
      publishedBy: req.user?._id,
    });
    return res.json(round);
  },
  "Fehler beim Veröffentlichen der Runde.",
);

export const patchAdminOverrideScore = withPredictionHandler(
  async (req, res) => {
    const score = await overrideUserScore({
      roundId: req.params.roundId,
      userId: req.params.userId,
      total: req.body?.total,
      reason: req.body?.reason,
      overrideBy: req.user?._id,
    });
    return res.json(score);
  },
  "Fehler beim Überschreiben des Scores.",
);

export const deleteAdminOverrideScore = withPredictionHandler(
  async (req, res) => {
    const result = await clearUserScoreOverride({
      roundId: req.params.roundId,
      userId: req.params.userId,
      clearedBy: req.user?._id,
    });
    return res.json(result);
  },
  "Fehler beim Entfernen des Overrides.",
);

export const postAdminRescoreFromRace = withPredictionHandler(
  async (req, res) => {
    const result = await scoreRoundFromRaceResults({
      roundId: req.params.roundId,
      generatedBy: req.user?._id,
      trigger: req.body?.trigger || "publish_recheck",
      force: true,
      preserveOverrides: true,
    });
    return res.json(result);
  },
  "Fehler beim Re-Scoring aus Race-Ergebnissen.",
);

export const deleteAdminRound = withPredictionHandler(
  async (req, res) => {
    const result = await deletePredictionRound({
      roundId: req.params.roundId,
      deletedBy: req.user?._id,
    });
    return res.json(result);
  },
  "Fehler beim Löschen der Prediction-Runde.",
);
