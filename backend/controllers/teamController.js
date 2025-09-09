import Team from "../models/Team.js";

export const getAllTeams = async (req, res) => {
  const teams = await Team.find();
  res.json(teams);
};

export const createTeam = async (req, res) => {
  const { name, color, logoUrl } = req.body;
  const team = await Team.create({ name, color, logoUrl });
  res.status(201).json(team);
};

export const updateTeam = async (req, res) => {
  const { id } = req.params;
  const team = await Team.findByIdAndUpdate(id, req.body, { new: true });
  res.json(team);
};

export const deleteTeam = async (req, res) => {
  const { id } = req.params;
  await Team.findByIdAndDelete(id);
  res.json({ message: "Team gelöscht" });
};

export const getTeamById = async (req, res) => {
  const { id } = req.params;
  const team = await Team.findById(id);
  if (!team) return res.status(404).json({ message: "Team nicht gefunden" });
  res.json(team);
};
