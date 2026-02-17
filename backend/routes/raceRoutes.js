import express from "express";
import {
  getRacesBySeason,
  createRaceForSeason,
  deleteRace,
  updateRaceResults,
  getRaceById,
} from "../controllers/raceController.js";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/season/:seasonId", getRacesBySeason);
router.post("/season/:seasonId", protect, requireAdmin, createRaceForSeason);
router.delete("/:id", protect, requireAdmin, deleteRace);
router.get("/:raceId", getRaceById);
router.put("/:raceId/results", protect, requireAdmin, updateRaceResults);

export default router;
