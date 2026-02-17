import User from "../models/User.js";
import bcrypt from "bcryptjs";
import UserSeasonTeam from "../models/UserSeasonTeam.js";
import Race from "../models/Race.js";
import Season from "../models/Season.js";

export const getAllUsers = async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
};

export const getCurrentUser = async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  res.json(user);
};

// GET /users/:id
export const getSingleUser = async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
  if (!user) {
    return res.status(404).json({ message: "Benutzer nicht gefunden" });
  }
  res.json(user);
};

// PUT /users/:id/password
export const updateUserPassword = async (req, res) => {
  const hashed = await bcrypt.hash(req.body.password, 10);
  await User.findByIdAndUpdate(req.params.id, { password: hashed });
  res.json({ message: "Passwort aktualisiert" });
};

// PUT /users/:id/role
export const updateUserRole = async (req, res) => {
  const { role } = req.body;
  if (!["admin", "user"].includes(role)) {
    return res.status(400).json({ message: "Ungültige Rolle" });
  }
  await User.findByIdAndUpdate(req.params.id, { role });
  res.json({ message: "Rolle aktualisiert" });
};

// DELETE /users/:id
export const deleteUser = async (req, res) => {
  const { id: userId } = req.params;
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "Benutzer nicht gefunden" });
  }

  const racesWithResults = await Race.find({ "results.user": userId })
    .select("season")
    .populate("season", "name");

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

  if (blockingSeasonMap.size > 0) {
    const blockingSeasons = [...blockingSeasonMap.values()].sort((a, b) =>
      a.localeCompare(b, "de-CH"),
    );
    const seasonHint =
      blockingSeasons.length > 0
        ? ` Betroffene Seasons: ${blockingSeasons.join(", ")}.`
        : "";
    return res.status(409).json({
      message:
        `Benutzer kann nicht gelöscht werden, weil Resultate in bestehenden Seasons vorhanden sind.${seasonHint}`,
      seasons: blockingSeasons,
    });
  }

  await User.findByIdAndDelete(userId);
  await UserSeasonTeam.deleteMany({ user: userId });
  await Season.updateMany(
    { participants: userId },
    { $pull: { participants: userId } },
  );

  res.json({ message: "Benutzer gelöscht" });
};
