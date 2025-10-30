// backend/controllers/userSeasonTeamController.js

import asyncHandler from "express-async-handler";
import UserSeasonTeam from "../models/UserSeasonTeam.js";

// @desc    Team für User in einer bestimmten Season zuweisen
// @route   POST /api/userSeasonTeams
// @access  Private
const createUserSeasonTeam = asyncHandler(async (req, res) => {
  const { teamId, seasonId, userId: userIdFromBody } = req.body;
  const userId = userIdFromBody || req.user._id;

  if (!teamId || !seasonId || !userId) {
    res.status(400);
    throw new Error("TeamId, SeasonId und UserId sind erforderlich.");
  }

  // Prüfen, ob User schon ein Team in dieser Season hat
  const existingUserEntry = await UserSeasonTeam.findOne({
    user: userId,
    season: seasonId,
  });
  try {
    if (existingUserEntry) {
      existingUserEntry.team = teamId;
      await existingUserEntry.save();
      return res.status(200).json(existingUserEntry);
    }

    const newEntry = await UserSeasonTeam.create({
      user: userId,
      season: seasonId,
      team: teamId,
    });

    return res.status(201).json(newEntry);
  } catch (error) {
    // Fehler durch Unique Index auf (team + season)
    if (
      error.code === 11000 &&
      error.keyPattern?.team &&
      error.keyPattern?.season
    ) {
      res.status(400);
      throw new Error(
        "Dieses Team wurde bereits von einer anderen Person gewählt."
      );
    }

    // Anderer Fehler
    console.error("Fehler bei Teamzuweisung:", error);
    res.status(500);
    throw new Error("Fehler beim Speichern der Teamzuweisung.");
  }

  const newEntry = await UserSeasonTeam.create({
    user: userId,
    season: seasonId,
    team: teamId,
  });

  res.status(201).json(newEntry);
});

// @desc    Alle Teamzuweisungen einer Season abrufen
// @route   GET /api/userSeasonTeams?season=SEASON_ID
// @access  Private
const getUserSeasonTeams = asyncHandler(async (req, res) => {
  const { season } = req.query;

  if (!season) {
    res.status(400);
    throw new Error("Season ID ist erforderlich.");
  }

  const assignments = await UserSeasonTeam.find({ season })
    .populate("user", "realname username email")
    .populate("team", "name logo color")
    .populate("season", "name");

  res.json(assignments);
});

// @desc    Teamzuweisungen eines bestimmten Users abrufen
// @route   GET /api/userSeasonTeams/user/:userId
// @access  Private
const getUserSeasonTeamsByUser = asyncHandler(async (req, res) => {
  const userId = req.params.userId;

  const assignments = await UserSeasonTeam.find({ user: userId })
    .populate("team", "name logo color")
    .populate("season", "name");

  res.json(assignments);
});

const deleteUserSeasonTeam = asyncHandler(async (req, res) => {
  const { userId, seasonId } = req.body;

  if (!userId || !seasonId) {
    res.status(400);
    throw new Error("UserId und SeasonId sind erforderlich.");
  }

  const deleted = await UserSeasonTeam.findOneAndDelete({
    user: userId,
    season: seasonId,
  });

  if (!deleted) {
    res.status(404);
    throw new Error("Keine passende Teamzuweisung gefunden.");
  }

  res.status(200).json({ message: "Teamzuweisung gelöscht." });
});

export {
  createUserSeasonTeam,
  getUserSeasonTeams,
  getUserSeasonTeamsByUser,
  deleteUserSeasonTeam,
};
