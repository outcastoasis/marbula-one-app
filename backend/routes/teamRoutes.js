import express from "express";
import {
  createTeam,
  getAllTeams,
  updateTeam,
  deleteTeam,
  getTeamById,
} from "../controllers/teamController.js";

const router = express.Router();

router.get("/", getAllTeams);
router.post("/", createTeam);
router.put("/:id", updateTeam);
router.delete("/:id", deleteTeam);
router.get("/:id", getTeamById);

export default router;
