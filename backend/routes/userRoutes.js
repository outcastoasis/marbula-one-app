import express from "express";
import {
  getAllUsers,
  updateUserTeam,
  chooseTeam,
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";
import { getCurrentUser } from "../controllers/userController.js";

const router = express.Router();

router.get("/", protect, getAllUsers); // optional: middleware erweitern für nur-Admins
router.put("/choose-team", protect, chooseTeam);
router.put("/:id/team", protect, updateUserTeam);
router.get("/me", protect, getCurrentUser);

export default router;
