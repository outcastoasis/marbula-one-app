import User from "../models/User.js";
import Team from "../models/Team.js";

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

  // Team schon vergeben?
  const alreadyTaken = await User.findOne({
    selectedTeam: teamId,
    _id: { $ne: userId },
  });
  if (alreadyTaken) {
    return res.status(400).json({ message: "Team ist bereits vergeben" });
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { selectedTeam: teamId || null }, // null für Entfernen
    { new: true }
  ).populate("selectedTeam");

  res.json(user);
};

export const getCurrentUser = async (req, res) => {
  const user = await User.findById(req.user._id).populate("selectedTeam");
  res.json(user);
};
