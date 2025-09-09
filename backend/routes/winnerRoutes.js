import express from "express";
import {
  getAllWinners,
  createWinner,
} from "../controllers/winnerController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Alle Gewinner abrufen (öffentlich)
router.get("/", getAllWinners);

// Neuen Gewinner eintragen (nur eingeloggt)
router.post("/", protect, createWinner);

export default router;
