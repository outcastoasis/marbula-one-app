import express from "express";
import {
  getAllSeasons,
  createSeason,
  deleteSeason,
} from "../controllers/seasonController.js";

const router = express.Router();

router.get("/", getAllSeasons);
router.post("/", createSeason);
router.delete("/:id", deleteSeason);

export default router;
