// backend/controllers/seasonController.js

import Season from "../models/Season.js";
import UserSeasonTeam from "../models/UserSeasonTeam.js";

export const getAllSeasons = async (req, res) => {
  const seasons = await Season.find().sort({ year: -1 });
  res.json(seasons);
};

export const createSeason = async (req, res) => {
  const { name, eventDate, participants, teams } = req.body;

  const season = await Season.create({
    name,
    eventDate,
    participants,
    teams,
  });

  res.status(201).json(season);
};

export const deleteSeason = async (req, res) => {
  try {
    const seasonId = req.params.id;

    // 1️⃣ Season löschen
    const deletedSeason = await Season.findByIdAndDelete(seasonId);
    if (!deletedSeason) {
      return res.status(404).json({ message: "Season nicht gefunden" });
    }

    // 2️⃣ Alle zugehörigen Teamzuweisungen löschen
    await UserSeasonTeam.deleteMany({ season: seasonId });

    res.json({ message: "Season und zugehörige Teamzuweisungen gelöscht" });
  } catch (error) {
    console.error("Fehler beim Löschen der Season:", error);
    res.status(500).json({ message: "Fehler beim Löschen der Season" });
  }
};

export const setCurrentSeason = async (req, res) => {
  try {
    const seasonId = req.params.id;

    // Setze alle auf false
    await Season.updateMany({}, { isCurrent: false });

    // Setze diese eine auf true
    await Season.findByIdAndUpdate(seasonId, { isCurrent: true });

    res.status(200).json({ message: "Aktuelle Season gesetzt" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Fehler beim Setzen der aktuellen Season" });
  }
};

export const getCurrentSeason = async (req, res) => {
  const current = await Season.findOne({ isCurrent: true })
    .populate("participants")
    .populate("teams");
  if (!current)
    return res.status(404).json({ message: "Keine aktuelle Season gesetzt" });
  res.json(current);
};
