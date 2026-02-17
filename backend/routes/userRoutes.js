import express from "express";
import {
  createUser,
  getAllUsers,
  getSingleUser,
  updateUserPassword,
  updateUserRealname,
  updateUserRole,
  deleteUser,
  getCurrentUser,
} from "../controllers/userController.js";
import {
  protect,
  requireAdmin,
  requireAdminOrSelf,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, requireAdmin, createUser);
router.get("/", protect, requireAdmin, getAllUsers);
router.get("/me", protect, getCurrentUser);
router.get("/:id", protect, requireAdminOrSelf("id"), getSingleUser);
router.put("/:id/password", protect, requireAdminOrSelf("id"), updateUserPassword);
router.put("/:id/name", protect, requireAdmin, updateUserRealname);
router.put("/:id/role", protect, requireAdmin, updateUserRole);
router.delete("/:id", protect, requireAdmin, deleteUser);

export default router;
