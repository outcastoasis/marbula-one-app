// backend/controllers/seasonController.js

import Season from "../models/Season.js";
import UserSeasonTeam from "../models/UserSeasonTeam.js";
import Race from "../models/Race.js";
import { runWithOptionalTransaction } from "../utils/transaction.js";

const deleteSeasonWithDependencies = async (seasonId, session) => {
  const writeOptions = session ? { session } : undefined;
  const deletedSeason = await Season.findByIdAndDelete(seasonId, writeOptions);

  if (!deletedSeason) {
    return { status: 404, body: { message: "Season nicht gefunden" } };
  }

  await UserSeasonTeam.deleteMany({ season: seasonId }, writeOptions);
  await Race.deleteMany({ season: seasonId }, writeOptions);

  return {
    status: 200,
    body: { message: "Season, zugehörige Teamzuweisungen und Rennen gelöscht" },
  };
};

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
    const result = await runWithOptionalTransaction((session) =>
      deleteSeasonWithDependencies(req.params.id, session),
    );
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Fehler beim Löschen der Season:", error);
    return res.status(500).json({ message: "Fehler beim Löschen der Season" });
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
