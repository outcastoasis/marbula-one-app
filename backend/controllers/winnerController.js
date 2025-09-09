import Winner from "../models/Winner.js";

// GET /api/winners – alle Gewinner abrufen
export const getAllWinners = async (req, res) => {
  try {
    const winners = await Winner.find().sort({ date: -1 });
    res.json(winners);
  } catch (err) {
    res.status(500).json({ message: "Fehler beim Abrufen der Gewinner" });
  }
};

// POST /api/winners – neuen Gewinner eintragen
export const createWinner = async (req, res) => {
  try {
    const {
      date,
      location,
      winnerUser,
      winnerTeam,
      lastPlaceUser,
      lastPlaceTeam,
      nextOrganizer,
      notes,
    } = req.body;

    const newWinner = new Winner({
      date,
      location,
      winnerUser,
      winnerTeam,
      lastPlaceUser,
      lastPlaceTeam,
      nextOrganizer,
      notes,
    });

    const savedWinner = await newWinner.save();
    res.status(201).json(savedWinner);
  } catch (err) {
    res.status(400).json({ message: "Fehler beim Speichern des Gewinners" });
  }
};
