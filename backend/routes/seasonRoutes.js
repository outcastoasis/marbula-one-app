// backend/routes/seasonRoutes.js

import express from "express";
import {
  getAllSeasons,
  createSeason,
  deleteSeason,
  setCurrentSeason,
  getCurrentSeason,
} from "../controllers/seasonController.js";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getAllSeasons);
router.post("/", protect, requireAdmin, createSeason);
router.delete("/:id", protect, requireAdmin, deleteSeason);
router.put("/:id/set-current", protect, requireAdmin, setCurrentSeason);
router.get("/current", getCurrentSeason);

export default router;
