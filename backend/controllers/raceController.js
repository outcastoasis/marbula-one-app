import mongoose from "mongoose";
import Race from "../models/Race.js";
import { bumpStatsRevision } from "../utils/statsRevision.js";

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
    return res.status(500).json({ message: "Fehler beim Erstellen des Rennens" });
  }
};

export const deleteRace = async (req, res) => {
  try {
    const { id } = req.params;
    const race = await Race.findByIdAndDelete(id);
    if (!race) {
      return res.status(404).json({ message: "Rennen nicht gefunden" });
    }

    await bumpStatsRevision();
    return res.json({ message: "Rennen gelöscht" });
  } catch (error) {
    console.error("Fehler beim Löschen des Rennens:", error);
    return res.status(500).json({ message: "Fehler beim Löschen des Rennens" });
  }
};

export const updateRaceResults = async (req, res) => {
  const { raceId } = req.params;
  const { results } = req.body;

  try {
    const race = await Race.findById(raceId);
    if (!race) {
      return res.status(404).json({ message: "Rennen nicht gefunden" });
    }

    race.results = (Array.isArray(results) ? results : []).map((result) => ({
      user: new mongoose.Types.ObjectId(result.user),
      pointsEarned: result.pointsEarned,
    }));

    await race.save();
    await bumpStatsRevision();

    await race.populate("results.user");
    return res.json(race);
  } catch (err) {
    console.error("Fehler beim Speichern der Ergebnisse:", err);
    return res.status(500).json({ message: "Fehler beim Speichern der Ergebnisse" });
  }
};
