import express from "express";
import { getMyStats, getUserStatsById } from "../controllers/statsController.js";
import { protect, requireAdminOrSelf } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/me", protect, getMyStats);
router.get("/users/:userId", protect, requireAdminOrSelf("userId"), getUserStatsById);

export default router;
