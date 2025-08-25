import Race from "../models/Race.js";

export const getAllRaces = async (req, res) => {
  const races = await Race.find().sort({ date: 1 });
  res.json(races);
};

export const createRace = async (req, res) => {
  const { name, date } = req.body;
  const race = await Race.create({ name, date });
  res.status(201).json(race);
};

export const deleteRace = async (req, res) => {
  const { id } = req.params;
  await Race.findByIdAndDelete(id);
  res.json({ message: "Rennen gelöscht" });
};

export const getRacesBySeason = async (req, res) => {
  const races = await Race.find({ season: req.params.seasonId }).sort({
    date: 1,
  });
  res.json(races);
};

export const createRaceForSeason = async (req, res) => {
  const { name, date } = req.body;
  const seasonId = req.params.seasonId;
  const race = await Race.create({ name, date, season: seasonId });
  res.status(201).json(race);
};
