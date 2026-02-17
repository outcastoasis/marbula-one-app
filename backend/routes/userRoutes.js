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
import {
  protect,
  requireAdmin,
  requireAdminOrSelf,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, requireAdmin, getAllUsers);
router.get("/me", protect, getCurrentUser);
router.get("/:id", protect, requireAdminOrSelf("id"), getSingleUser);
router.put("/:id/team", protect, requireAdminOrSelf("id"), updateUserTeam);
router.put("/:id/password", protect, requireAdminOrSelf("id"), updateUserPassword);
router.put("/:id/role", protect, requireAdmin, updateUserRole);
router.delete("/:id", protect, requireAdmin, deleteUser);
router.put("/choose-team", protect, chooseTeam);

export default router;
