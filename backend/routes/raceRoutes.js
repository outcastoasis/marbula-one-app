import express from "express";
import {
  getRacesBySeason,
  createRaceForSeason,
} from "../controllers/raceController.js";

const router = express.Router();

router.get("/season/:seasonId", getRacesBySeason);
router.post("/season/:seasonId", createRaceForSeason);

export default router;
