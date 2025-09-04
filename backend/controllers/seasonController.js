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

export const setCurrentSeason = async (req, res) => {
  try {
    const seasonId = req.params.id;

    // Setze alle auf false
    await Season.updateMany({}, { isCurrent: false });

    // Setze diese eine auf true
    await Season.findByIdAndUpdate(seasonId, { isCurrent: true });

    res.status(200).json({ message: "Aktuelle Season gesetzt" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Fehler beim Setzen der aktuellen Season" });
  }
};

export const getCurrentSeason = async (req, res) => {
  const current = await Season.findOne({ isCurrent: true }).populate(
    "participants"
  );
  if (!current)
    return res.status(404).json({ message: "Keine aktuelle Season gesetzt" });
  res.json(current);
};
