import Season from "../models/Season.js";

export const getAllSeasons = async (req, res) => {
  const seasons = await Season.find().sort({ year: -1 });
  res.json(seasons);
};

export const createSeason = async (req, res) => {
  const { name, eventDate, participants } = req.body;

  const season = await Season.create({
    name,
    eventDate,
    participants,
  });

  res.status(201).json(season);
};

export const deleteSeason = async (req, res) => {
  await Season.findByIdAndDelete(req.params.id);
  res.json({ message: "Season gelöscht" });
};
