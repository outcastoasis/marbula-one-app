import express from "express";
import {
  createTeam,
  getAllTeams,
  updateTeam,
  deleteTeam,
  getTeamById,
  getSeasonsByTeam,
} from "../controllers/teamController.js";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getAllTeams);
router.post("/", protect, requireAdmin, createTeam);
router.put("/:id", protect, requireAdmin, updateTeam);
router.delete("/:id", protect, requireAdmin, deleteTeam);
router.get("/:id", getTeamById);
router.get("/:id/seasons", getSeasonsByTeam);

export default router;
