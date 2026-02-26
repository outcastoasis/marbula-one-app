// backend/routes/seasonRoutes.js

import express from "express";
import {
  getAllSeasons,
  createSeason,
  deleteSeason,
  setCurrentSeason,
  getCurrentSeason,
  getCurrentSeasonStandingsCombined,
  getSeasonStandingsCombined,
  setSeasonCompleted,
} from "../controllers/seasonController.js";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getAllSeasons);
router.post("/", protect, requireAdmin, createSeason);
router.delete("/:id", protect, requireAdmin, deleteSeason);
router.put("/:id/set-current", protect, requireAdmin, setCurrentSeason);
router.put("/:id/set-completed", protect, requireAdmin, setSeasonCompleted);
router.get("/current/combined-standings", getCurrentSeasonStandingsCombined);
router.get("/current", getCurrentSeason);
router.get("/:seasonId/combined-standings", getSeasonStandingsCombined);

export default router;
