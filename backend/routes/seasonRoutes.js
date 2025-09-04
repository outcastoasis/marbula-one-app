import express from "express";
import {
  getAllSeasons,
  createSeason,
  deleteSeason,
  setCurrentSeason,
  getCurrentSeason,
} from "../controllers/seasonController.js";

const router = express.Router();

router.get("/", getAllSeasons);
router.post("/", createSeason);
router.delete("/:id", deleteSeason);
router.put("/:id/set-current", setCurrentSeason);
router.get("/current", getCurrentSeason);

export default router;
