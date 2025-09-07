import express from "express";
import {
  getAllUsers,
  getSingleUser,
  updateUserTeam,
  updateUserPassword,
  updateUserRole,
  deleteUser,
  chooseTeam,
  getCurrentUser,
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getAllUsers);
router.get("/me", protect, getCurrentUser);
router.get("/:id", protect, getSingleUser);
router.put("/:id/team", protect, updateUserTeam);
router.put("/:id/password", protect, updateUserPassword);
router.put("/:id/role", protect, updateUserRole);
router.delete("/:id", protect, deleteUser);
router.put("/choose-team", protect, chooseTeam);

export default router;
