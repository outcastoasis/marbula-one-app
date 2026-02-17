import User from "../models/User.js";
import bcrypt from "bcryptjs";

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
