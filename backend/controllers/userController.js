import User from "../models/User.js";
import bcrypt from "bcryptjs";

export const chooseTeam = async (req, res) => {
  const userId = req.user.id;
  const { teamId } = req.body;

  // Prüfen, ob Team bereits vergeben ist
  const alreadyTaken = await User.findOne({ selectedTeam: teamId });
  if (alreadyTaken) {
    return res.status(400).json({ message: "Team ist bereits vergeben" });
  }

  // Benutzer-Team setzen
  const user = await User.findByIdAndUpdate(
    userId,
    { selectedTeam: teamId },
    { new: true }
  ).populate("selectedTeam");

  res.json({ message: "Team erfolgreich gewählt", user });
};

export const getAllUsers = async (req, res) => {
  const users = await User.find().populate("selectedTeam");
  res.json(users);
};

export const updateUserTeam = async (req, res) => {
  const { teamId } = req.body;
  const userId = req.params.id;

  if (teamId) {
    // Team schon vergeben?
    const alreadyTaken = await User.findOne({
      selectedTeam: teamId,
      _id: { $ne: userId },
    });
    if (alreadyTaken) {
      return res.status(400).json({ message: "Team ist bereits vergeben" });
    }
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { selectedTeam: teamId || null }, // null erlaubt
    { new: true }
  ).populate("selectedTeam");

  res.json(user);
};

export const getCurrentUser = async (req, res) => {
  const user = await User.findById(req.user._id).populate("selectedTeam");
  res.json(user);
};

// GET /users/:id
export const getSingleUser = async (req, res) => {
  const user = await User.findById(req.params.id).populate("selectedTeam");
  if (!user)
    return res.status(404).json({ message: "Benutzer nicht gefunden" });
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
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user)
    return res.status(404).json({ message: "Benutzer nicht gefunden" });
  res.json({ message: "Benutzer gelöscht" });
};
