import express from "express";
import {
  getRacesBySeason,
  createRaceForSeason,
  deleteRace,
  updateRaceResults,
  getRaceById,
} from "../controllers/raceController.js";

const router = express.Router();

router.get("/season/:seasonId", getRacesBySeason);
router.post("/season/:seasonId", createRaceForSeason);
router.delete("/:id", deleteRace);
router.get("/:raceId", getRaceById);
router.put("/:raceId/results", updateRaceResults);

export default router;
