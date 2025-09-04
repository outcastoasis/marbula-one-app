import Race from "../models/Race.js";
import mongoose from "mongoose";

export const getAllRaces = async (req, res) => {
  const races = await Race.find().sort({ date: 1 });
  res.json(races);
};

export const getRacesBySeason = async (req, res) => {
  const races = await Race.find({ season: req.params.seasonId })
    .sort({ date: 1 })
    .populate("results.user");
  res.json(races);
};

export const getRaceById = async (req, res) => {
  const race = await Race.findById(req.params.raceId);
  if (!race) return res.status(404).json({ message: "Rennen nicht gefunden" });
  res.json(race);
};

export const createRaceForSeason = async (req, res) => {
  const { name } = req.body;
  const seasonId = req.params.seasonId;
  const race = await Race.create({ name, season: seasonId });
  res.status(201).json(race);
};

export const deleteRace = async (req, res) => {
  const { id } = req.params;
  const race = await Race.findByIdAndDelete(id);
  if (!race) {
    return res.status(404).json({ message: "Rennen nicht gefunden" });
  }
  res.json({ message: "Rennen gelöscht" });
};

export const updateRaceResults = async (req, res) => {
  const { raceId } = req.params;
  const { results } = req.body;

  try {
    const race = await Race.findById(raceId);
    if (!race)
      return res.status(404).json({ message: "Rennen nicht gefunden" });

    // Ersetze bestehende Resultate
    race.results = results.map((r) => ({
      user: new mongoose.Types.ObjectId(r.user),
      pointsEarned: r.pointsEarned,
    }));

    await race.save();

    // Zurückgeben inklusive User-Daten
    await race.populate("results.user");

    res.json(race);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Fehler beim Speichern der Ergebnisse" });
  }
};
