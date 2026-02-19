import mongoose from "mongoose";
import Race from "../models/Race.js";
import {
  PredictionServiceError,
  deletePredictionDataForRace,
  syncPredictionsForRace,
} from "../services/predictionService.js";
import { bumpStatsRevision } from "../utils/statsRevision.js";
import { runWithOptionalTransaction } from "../utils/transaction.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const deleteRaceWithDependencies = async (raceId, session) => {
  if (!isValidObjectId(raceId)) {
    return { status: 400, body: { message: "Ungültige Race-ID" } };
  }

  const writeOptions = session ? { session } : undefined;
  const race = await Race.findByIdAndDelete(raceId, writeOptions);
  if (!race) {
    return { status: 404, body: { message: "Rennen nicht gefunden" } };
  }

  await deletePredictionDataForRace({ raceId, session });

  return {
    status: 200,
    body: { message: "Rennen und zugehörige Prediction-Daten gelöscht" },
  };
};

export const getAllRaces = async (req, res) => {
  const races = await Race.find().sort({ _id: 1 });
  return res.json(races);
};

export const getRacesBySeason = async (req, res) => {
  const races = await Race.find({ season: req.params.seasonId })
    .sort({ _id: 1 })
    .populate("results.user");
  return res.json(races);
};

export const getRaceById = async (req, res) => {
  const race = await Race.findById(req.params.raceId);
  if (!race) {
    return res.status(404).json({ message: "Rennen nicht gefunden" });
  }
  return res.json(race);
};

export const createRaceForSeason = async (req, res) => {
  try {
    const { name } = req.body;
    const seasonId = req.params.seasonId;
    const race = await Race.create({ name, season: seasonId });
    await bumpStatsRevision();
    return res.status(201).json(race);
  } catch (error) {
    console.error("Fehler beim Erstellen des Rennens:", error);
    return res
      .status(500)
      .json({ message: "Fehler beim Erstellen des Rennens" });
  }
};

export const deleteRace = async (req, res) => {
  try {
    const result = await runWithOptionalTransaction((session) =>
      deleteRaceWithDependencies(req.params.id, session),
    );
    if (result.status === 200) {
      await bumpStatsRevision();
    }
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Fehler beim Löschen des Rennens:", error);
    return res.status(500).json({ message: "Fehler beim Löschen des Rennens" });
  }
};

export const updateRaceResults = async (req, res) => {
  const { raceId } = req.params;
  const { results } = req.body;

  try {
    if (!isValidObjectId(raceId)) {
      return res.status(400).json({ message: "Ungültige Race-ID" });
    }

    const race = await Race.findById(raceId);
    if (!race) {
      return res.status(404).json({ message: "Rennen nicht gefunden" });
    }

    const normalizedResults = Array.isArray(results) ? results : [];
    for (let index = 0; index < normalizedResults.length; index += 1) {
      if (!isValidObjectId(normalizedResults[index]?.user)) {
        return res.status(400).json({
          message: `Ungültige Benutzer-ID in Ergebnisposition ${index + 1}.`,
        });
      }
    }

    race.results = normalizedResults.map((result) => ({
      user: new mongoose.Types.ObjectId(result.user),
      pointsEarned: result.pointsEarned,
    }));

    await race.save();

    try {
      await syncPredictionsForRace({
        raceId,
        triggerInfo: {
          triggeredBy: req.user?._id || null,
        },
      });
    } catch (syncError) {
      if (syncError instanceof PredictionServiceError) {
        return res
          .status(syncError.statusCode)
          .json({ message: syncError.message });
      }
      throw syncError;
    }

    await bumpStatsRevision();

    await race.populate("results.user");
    return res.json(race);
  } catch (err) {
    console.error("Fehler beim Speichern der Ergebnisse:", err);
    return res
      .status(500)
      .json({ message: "Fehler beim Speichern der Ergebnisse" });
  }
};
