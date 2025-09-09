import express from "express";
import {
  getAllWinners,
  createWinner,
  updateWinner,
  deleteWinner,
} from "../controllers/winnerController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getAllWinners);
router.post("/", protect, createWinner);
router.put("/:id", protect, updateWinner);
router.delete("/:id", protect, deleteWinner);

export default router;
