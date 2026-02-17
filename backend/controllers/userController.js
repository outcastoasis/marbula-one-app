import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import UserSeasonTeam from "../models/UserSeasonTeam.js";
import Race from "../models/Race.js";
import Season from "../models/Season.js";
import { runWithOptionalTransaction } from "../utils/transaction.js";

const applySession = (query, session) =>
  session ? query.session(session) : query;
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const sanitizeUser = (userDoc) => {
  const { password: _password, ...safeUser } = userDoc.toObject();
  return safeUser;
};

const buildBlockingSeasonList = (racesWithResults) => {
  const blockingSeasonMap = new Map();

  racesWithResults.forEach((race) => {
    const seasonId =
      typeof race?.season === "object" ? race.season?._id : race?.season;
    const seasonName =
      typeof race?.season === "object" ? race.season?.name : null;

    if (seasonId) {
      blockingSeasonMap.set(String(seasonId), seasonName || "Unbekannte Season");
    }
  });

  return [...blockingSeasonMap.values()].sort((a, b) =>
    a.localeCompare(b, "de-CH"),
  );
};

const deleteUserWithDependencies = async (userId, actingUserId, session) => {
  if (!isValidObjectId(userId)) {
    return { status: 400, body: { message: "Ungültige Benutzer-ID" } };
  }

  const user = await applySession(User.findById(userId), session);
  if (!user) {
    return { status: 404, body: { message: "Benutzer nicht gefunden" } };
  }

  const isAdminSelfDelete =
    user.role === "admin" && String(actingUserId || "") === String(user._id);
  if (isAdminSelfDelete) {
    return {
      status: 403,
      body: { message: "Admin kann sich nicht selbst löschen." },
    };
  }

  if (user.role === "admin") {
    const adminCount = await applySession(
      User.countDocuments({ role: "admin" }),
      session,
    );
    if (adminCount <= 1) {
      return {
        status: 409,
        body: { message: "Der letzte Admin kann nicht gelöscht werden." },
      };
    }
  }

  const racesWithResults = await applySession(
    Race.find({ "results.user": userId })
      .select("season")
      .populate("season", "name"),
    session,
  );

  const blockingSeasons = buildBlockingSeasonList(racesWithResults);
  if (blockingSeasons.length > 0) {
    const seasonHint = ` Betroffene Seasons: ${blockingSeasons.join(", ")}.`;
    return {
      status: 409,
      body: {
        message: `Benutzer kann nicht gelöscht werden, weil Resultate in bestehenden Seasons vorhanden sind.${seasonHint}`,
        seasons: blockingSeasons,
      },
    };
  }

  const writeOptions = session ? { session } : undefined;
  await User.findByIdAndDelete(userId, writeOptions);
  await UserSeasonTeam.deleteMany({ user: userId }, writeOptions);
  await Season.updateMany(
    { participants: userId },
    { $pull: { participants: userId } },
    writeOptions,
  );

  return { status: 200, body: { message: "Benutzer gelöscht" } };
};

export const getAllUsers = async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
};

export const getCurrentUser = async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  res.json(user);
};

// POST /users
export const createUser = async (req, res) => {
  const username =
    typeof req.body.username === "string" ? req.body.username.trim() : "";
  const realname =
    typeof req.body.realname === "string" ? req.body.realname.trim() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!username || !realname || !password) {
    return res.status(400).json({
      message: "Bitte Benutzername, Name und Passwort angeben.",
    });
  }

  const userExists = await User.findOne({ username });
  if (userExists) {
    return res.status(409).json({ message: "Benutzername existiert bereits." });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    username,
    realname,
    password: hashedPassword,
  });

  return res
    .status(201)
    .json({ message: "Benutzer wurde erstellt.", user: sanitizeUser(user) });
};

// GET /users/:id
export const getSingleUser = async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Ungültige Benutzer-ID" });
  }

  const user = await User.findById(id).select("-password");
  if (!user) {
    return res.status(404).json({ message: "Benutzer nicht gefunden" });
  }
  res.json(user);
};

// PUT /users/:id/password
export const updateUserPassword = async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Ungültige Benutzer-ID" });
  }

  if (typeof req.body.password !== "string" || req.body.password.trim().length === 0) {
    return res.status(400).json({ message: "Passwort darf nicht leer sein." });
  }

  const hashed = await bcrypt.hash(req.body.password, 10);
  const updated = await User.findByIdAndUpdate(id, { password: hashed });
  if (!updated) {
    return res.status(404).json({ message: "Benutzer nicht gefunden" });
  }

  res.json({ message: "Passwort aktualisiert" });
};

// PUT /users/:id/role
export const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Ungültige Benutzer-ID" });
  }
  if (!["admin", "user"].includes(role)) {
    return res.status(400).json({ message: "Ungültige Rolle" });
  }

  const updated = await User.findByIdAndUpdate(id, { role });
  if (!updated) {
    return res.status(404).json({ message: "Benutzer nicht gefunden" });
  }

  res.json({ message: "Rolle aktualisiert" });
};

// PUT /users/:id/name
export const updateUserRealname = async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Ungültige Benutzer-ID" });
  }

  const realname =
    typeof req.body.realname === "string" ? req.body.realname.trim() : "";
  if (!realname) {
    return res.status(400).json({ message: "Name darf nicht leer sein." });
  }

  const updated = await User.findByIdAndUpdate(
    id,
    { realname },
    { new: true },
  ).select("-password");
  if (!updated) {
    return res.status(404).json({ message: "Benutzer nicht gefunden" });
  }

  return res.json({ message: "Name aktualisiert", user: updated });
};

// DELETE /users/:id
export const deleteUser = async (req, res) => {
  try {
    const result = await runWithOptionalTransaction((session) =>
      deleteUserWithDependencies(req.params.id, req.user?._id, session),
    );
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Fehler beim Löschen des Benutzers:", error);
    return res
      .status(500)
      .json({ message: "Fehler beim Löschen des Benutzers" });
  }
};
