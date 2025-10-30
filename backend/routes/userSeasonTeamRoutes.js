// backend/routes/userSeasonTeamRoutes.js

import express from "express";
import {
  createUserSeasonTeam,
  getUserSeasonTeams,
  getUserSeasonTeamsByUser,
  deleteUserSeasonTeam,
} from "../controllers/userSeasonTeamController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createUserSeasonTeam);
router.get("/", protect, getUserSeasonTeams);
router.get("/user/:userId", protect, getUserSeasonTeamsByUser);
router.delete("/", protect, deleteUserSeasonTeam);

export default router;
