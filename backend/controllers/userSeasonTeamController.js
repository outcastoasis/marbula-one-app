// backend/controllers/userSeasonTeamController.js

import asyncHandler from "express-async-handler";
import UserSeasonTeam from "../models/UserSeasonTeam.js";
import Season from "../models/Season.js";

const resolveTargetUserId = (req, userIdFromBody) => {
  if (req.user?.role === "admin") {
    return userIdFromBody || req.user._id;
  }

  if (userIdFromBody && userIdFromBody !== req.user?._id?.toString()) {
    return null;
  }

  return req.user?._id;
};

// @desc    Team für User in einer bestimmten Season zuweisen
// @route   POST /api/userSeasonTeams
// @access  Private
const createUserSeasonTeam = asyncHandler(async (req, res) => {
  const { teamId, seasonId, userId: userIdFromBody } = req.body;
  const userId = resolveTargetUserId(req, userIdFromBody);

  if (!userId) {
    res.status(403);
    throw new Error(
      "Nur Admins dürfen Teamzuweisungen für andere Benutzer speichern.",
    );
  }

  if (!teamId || !seasonId) {
    res.status(400);
    throw new Error("TeamId und SeasonId sind erforderlich.");
  }

  const season = await Season.findById(seasonId).select("participants teams");
  if (!season) {
    res.status(404);
    throw new Error("Season nicht gefunden.");
  }

  const participantIds = (season.participants || [])
    .map((participant) =>
      typeof participant === "object" ? participant?._id : participant,
    )
    .filter(Boolean)
    .map((id) => String(id));

  if (!participantIds.includes(String(userId))) {
    res.status(403);
    throw new Error(
      "Du bist in dieser Season nicht als Teilnehmer hinterlegt und kannst kein Team wählen.",
    );
  }

  const seasonTeamIds = (season.teams || [])
    .map((team) => (typeof team === "object" ? team?._id : team))
    .filter(Boolean)
    .map((id) => String(id));

  if (!seasonTeamIds.includes(String(teamId))) {
    res.status(400);
    throw new Error("Das gewählte Team ist in dieser Season nicht verfügbar.");
  }

  const existingUserEntry = await UserSeasonTeam.findOne({
    user: userId,
    season: seasonId,
  });

  try {
    if (existingUserEntry) {
      existingUserEntry.team = teamId;
      await existingUserEntry.save();
      await existingUserEntry.populate("team", "name logo color");
      return res.status(200).json(existingUserEntry);
    }

    const newEntry = await UserSeasonTeam.create({
      user: userId,
      season: seasonId,
      team: teamId,
    });
    await newEntry.populate("team", "name logo color");
    return res.status(201).json(newEntry);
  } catch (error) {
    if (
      error.code === 11000 &&
      error.keyPattern?.team &&
      error.keyPattern?.season
    ) {
      res.status(400);
      throw new Error(
        "Dieses Team wurde bereits von einer anderen Person gewählt.",
      );
    }

    console.error("Fehler bei Teamzuweisung:", error);
    res.status(500);
    throw new Error("Fehler beim Speichern der Teamzuweisung.");
  }
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
    .populate("user", "realname username")
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
  const { userId: userIdFromBody, seasonId } = req.body;
  const userId = resolveTargetUserId(req, userIdFromBody);

  if (!userId) {
    res.status(403);
    throw new Error(
      "Nur Admins dürfen Teamzuweisungen anderer Benutzer löschen.",
    );
  }

  if (!seasonId) {
    res.status(400);
    throw new Error("SeasonId ist erforderlich.");
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
