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
    const newWinner = new Winner(req.body);
    const savedWinner = await newWinner.save();
    res.status(201).json(savedWinner);
  } catch (err) {
    res.status(400).json({ message: "Fehler beim Speichern des Gewinners" });
  }
};

// PUT /api/winners/:id – bestehenden Eintrag bearbeiten
export const updateWinner = async (req, res) => {
  try {
    const updated = await Winner.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated) return res.status(404).json({ message: "Nicht gefunden" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: "Fehler beim Aktualisieren" });
  }
};

// DELETE /api/winners/:id – Eintrag löschen
export const deleteWinner = async (req, res) => {
  try {
    const deleted = await Winner.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Nicht gefunden" });
    res.json({ message: "Eintrag gelöscht" });
  } catch (err) {
    res.status(400).json({ message: "Fehler beim Löschen" });
  }
};
