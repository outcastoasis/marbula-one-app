import express from "express";
import {
  createAdminRound,
  deleteAdminRound,
  getAdminRoundById,
  getAdminRounds,
  getMyPredictions,
  getRoundById,
  getRounds,
  deleteAdminOverrideScore,
  patchAdminOverrideScore,
  patchAdminRoundScoringConfig,
  patchAdminRoundStatus,
  postAdminPublishRound,
  postAdminRescoreFromRace,
  postAdminScoreRound,
  putMyEntry,
} from "../controllers/predictionController.js";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/rounds", protect, getRounds);
router.get("/rounds/:roundId", protect, getRoundById);
router.put("/rounds/:roundId/entry", protect, putMyEntry);
router.get("/me", protect, getMyPredictions);

router.get("/admin/rounds", protect, requireAdmin, getAdminRounds);
router.post("/admin/rounds", protect, requireAdmin, createAdminRound);
router.get("/admin/rounds/:roundId", protect, requireAdmin, getAdminRoundById);
router.patch(
  "/admin/rounds/:roundId/status",
  protect,
  requireAdmin,
  patchAdminRoundStatus,
);
router.patch(
  "/admin/rounds/:roundId/scoring-config",
  protect,
  requireAdmin,
  patchAdminRoundScoringConfig,
);
router.post(
  "/admin/rounds/:roundId/score",
  protect,
  requireAdmin,
  postAdminScoreRound,
);
router.post(
  "/admin/rounds/:roundId/publish",
  protect,
  requireAdmin,
  postAdminPublishRound,
);
router.patch(
  "/admin/rounds/:roundId/scores/:userId/override",
  protect,
  requireAdmin,
  patchAdminOverrideScore,
);
router.delete(
  "/admin/rounds/:roundId/scores/:userId/override",
  protect,
  requireAdmin,
  deleteAdminOverrideScore,
);
router.post(
  "/admin/rounds/:roundId/rescore-from-race",
  protect,
  requireAdmin,
  postAdminRescoreFromRace,
);
router.delete(
  "/admin/rounds/:roundId",
  protect,
  requireAdmin,
  deleteAdminRound,
);

export default router;
