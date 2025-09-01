import Race from "../models/Race.js";

export const getAllRaces = async (req, res) => {
  const races = await Race.find().sort({ date: 1 });
  res.json(races);
};

export const getRacesBySeason = async (req, res) => {
  const races = await Race.find({ season: req.params.seasonId }).sort({
    date: 1,
  });
  res.json(races);
};

export const createRaceForSeason = async (req, res) => {
  const { name } = req.body;
  const seasonId = req.params.seasonId;
  const race = await Race.create({ name, season: seasonId });
  res.status(201).json(race);
};

export const deleteRace = async (req, res) => {
  const { id } = req.params;
  const race = await Race.findByIdAndDelete(id);
  if (!race) {
    return res.status(404).json({ message: "Rennen nicht gefunden" });
  }
  res.json({ message: "Rennen gelöscht" });
};
