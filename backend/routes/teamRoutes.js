import express from "express";
import {
  createTeam,
  getAllTeams,
  updateTeam,
  deleteTeam,
} from "../controllers/teamController.js";

const router = express.Router();

router.get("/", getAllTeams);
router.post("/", createTeam);
router.put("/:id", updateTeam);
router.delete("/:id", deleteTeam);

export default router;
