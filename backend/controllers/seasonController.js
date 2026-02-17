// backend/controllers/seasonController.js

import mongoose from "mongoose";
import Season from "../models/Season.js";
import UserSeasonTeam from "../models/UserSeasonTeam.js";
import Race from "../models/Race.js";
import { runWithOptionalTransaction } from "../utils/transaction.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const deleteSeasonWithDependencies = async (seasonId, session) => {
  if (!isValidObjectId(seasonId)) {
    return { status: 400, body: { message: "Ungültige Season-ID" } };
  }

  const writeOptions = session ? { session } : undefined;
  const deletedSeason = await Season.findByIdAndDelete(seasonId, writeOptions);
  if (!deletedSeason) {
    return { status: 404, body: { message: "Season nicht gefunden" } };
  }

  await UserSeasonTeam.deleteMany({ season: seasonId }, writeOptions);
  await Race.deleteMany({ season: seasonId }, writeOptions);

  let newCurrentSeason = null;
  if (deletedSeason.isCurrent) {
    await Season.updateMany({}, { isCurrent: false }, writeOptions);

    const fallbackCurrentQuery = Season.findOne({
      _id: { $ne: seasonId },
    }).sort({
      eventDate: -1,
      _id: -1,
    });
    if (session) {
      fallbackCurrentQuery.session(session);
    }

    newCurrentSeason = await fallbackCurrentQuery;
    if (newCurrentSeason) {
      newCurrentSeason.isCurrent = true;
      await newCurrentSeason.save(writeOptions);
    }
  }

  return {
    status: 200,
    body: {
      message: "Season, zugehörige Teamzuweisungen und Rennen gelöscht",
      newCurrentSeason: newCurrentSeason
        ? { _id: newCurrentSeason._id, name: newCurrentSeason.name }
        : null,
    },
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
    if (!isValidObjectId(seasonId)) {
      return res.status(400).json({ message: "Ungültige Season-ID" });
    }

    const season = await Season.findById(seasonId);
    if (!season) {
      return res.status(404).json({ message: "Season nicht gefunden" });
    }

    await Season.updateMany({}, { isCurrent: false });
    season.isCurrent = true;
    await season.save();

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
