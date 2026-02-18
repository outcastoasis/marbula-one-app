import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import User from "../models/User.js";
import { getUserStatsPayload } from "../services/statsService.js";

const MAX_COMPARE_USERS = 5;

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const parseBoolean = (value, fallback) => {
  if (value === undefined) return fallback;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return fallback;
};

const parseCompareUserIds = (rawValue) => {
  if (!rawValue) return [];

  return String(rawValue)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .filter((id, index, self) => self.indexOf(id) === index)
    .slice(0, MAX_COMPARE_USERS);
};

const buildUserEntry = (userDoc, statsResponse) => ({
  _id: userDoc._id,
  username: userDoc.username,
  realname: userDoc.realname,
  stats: statsResponse.stats,
  meta: {
    revision: statsResponse.revision,
    cacheHit: statsResponse.cacheHit,
  },
});

const loadStatsForUser = async ({
  userId,
  completedOnly,
  seasonId,
}) => {
  const user = await User.findById(userId).select("username realname");
  if (!user) {
    return null;
  }

  const statsResponse = await getUserStatsPayload({
    userId,
    completedOnly,
    seasonId,
    useCache: true,
  });

  return buildUserEntry(user, statsResponse);
};

const getStatsResponse = asyncHandler(async (req, res) => {
  const baseUserId = req.params.userId || req.user?._id?.toString();
  if (!baseUserId || !isValidObjectId(baseUserId)) {
    return res.status(400).json({ message: "Ungültige Benutzer-ID." });
  }

  const requestedCompletedOnly = parseBoolean(req.query.completedOnly, true);
  if (requestedCompletedOnly !== true) {
    return res.status(400).json({
      message: "Stats können nur für abgeschlossene Seasons geladen werden.",
    });
  }
  const completedOnly = true;
  const seasonId = req.query.seasonId ? String(req.query.seasonId).trim() : null;
  if (seasonId && seasonId !== "all" && !isValidObjectId(seasonId)) {
    return res.status(400).json({ message: "Ungültige Season-ID." });
  }

  const compareIds = parseCompareUserIds(req.query.compare).filter(
    (id) => id !== baseUserId && isValidObjectId(id),
  );

  const [baseEntry, ...comparisonEntries] = await Promise.all([
    loadStatsForUser({ userId: baseUserId, completedOnly, seasonId }),
    ...compareIds.map((compareId) =>
      loadStatsForUser({ userId: compareId, completedOnly, seasonId }),
    ),
  ]);

  if (!baseEntry) {
    return res.status(404).json({ message: "Benutzer nicht gefunden." });
  }

  return res.json({
    meta: {
      completedOnly,
      seasonId: seasonId || "all",
      compareCount: comparisonEntries.filter(Boolean).length,
      generatedAt: new Date().toISOString(),
    },
    baseUser: baseEntry,
    comparisons: comparisonEntries.filter(Boolean),
  });
});

export const getMyStats = getStatsResponse;
export const getUserStatsById = getStatsResponse;
