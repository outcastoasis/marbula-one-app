import express from "express";
import {
  createTeam,
  getAllTeams,
  updateTeam,
  deleteTeam,
  getTeamById,
  getSeasonsByTeam,
} from "../controllers/teamController.js";

const router = express.Router();

router.get("/", getAllTeams);
router.post("/", createTeam);
router.put("/:id", updateTeam);
router.delete("/:id", deleteTeam);
router.get("/:id", getTeamById);
router.get("/:id/seasons", getSeasonsByTeam);

export default router;
