import mongoose from "mongoose";
import Race from "../models/Race.js";
import Season from "../models/Season.js";
import UserStatsCache from "../models/UserStatsCache.js";
import { getCurrentStatsRevision } from "../utils/statsRevision.js";

const toIdString = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  if (typeof value === "object" && value._id) return toIdString(value._id);
  return String(value);
};

const sortByObjectIdAsc = (a, b) =>
  a._id.toString().localeCompare(b._id.toString());

const buildRanking = (pointsByUser) => {
  const entries = Object.entries(pointsByUser).sort((a, b) => b[1] - a[1]);
  const ranking = {};
  let rank = 1;

  entries.forEach(([userId, points], index) => {
    if (index > 0 && points < entries[index - 1][1]) {
      rank = index + 1;
    }
    ranking[userId] = rank;
  });

  return ranking;
};

const selectCompletedSeasons = (seasons, completedOnly) => {
  if (!completedOnly) return seasons;
  return seasons.filter((season) => season.isCompleted === true);
};

const buildNotParticipatedSeasonStats = ({ season, races }) => ({
  seasonId: toIdString(season._id),
  seasonName: season.name,
  eventDate: season.eventDate,
  participationStatus: "not_participated",
  participationLabel: "Nicht teilgenommen",
  includedInOverall: false,
  raceCount: races.length,
  totalPoints: null,
  podiumCount: null,
  top3Rate: null,
  bestRace: null,
  worstRace: null,
  finalRank: null,
  rankChange: null,
  isSeasonWinner: false,
  isSharedSeasonWin: false,
  races: [],
});

const buildSeasonStatsForUser = ({ season, races, userId, participantIds }) => {
  const normalizedParticipantIds = [...new Set(participantIds)];

  const cumulativeTotals = {};
  normalizedParticipantIds.forEach((id) => {
    cumulativeTotals[id] = 0;
  });

  let totalPoints = 0;
  let podiumCount = 0;
  let firstInterimRank = null;
  let finalRank = null;
  let bestRace = null;
  let worstRace = null;

  const raceDetails = races.map((race, index) => {
    const racePointsByUser = {};
    normalizedParticipantIds.forEach((id) => {
      racePointsByUser[id] = 0;
    });

    (race.results || []).forEach((result) => {
      const resultUserId = toIdString(result?.user);
      if (resultUserId && resultUserId in racePointsByUser) {
        racePointsByUser[resultUserId] = Number(result?.pointsEarned) || 0;
      }
    });

    const raceRanking = buildRanking(racePointsByUser);
    const userRacePoints = racePointsByUser[userId] || 0;
    const userRaceRank = raceRanking[userId] || normalizedParticipantIds.length;

    normalizedParticipantIds.forEach((id) => {
      cumulativeTotals[id] += racePointsByUser[id] || 0;
    });

    const cumulativeRanking = buildRanking(cumulativeTotals);
    const userCumulativeRank =
      cumulativeRanking[userId] || normalizedParticipantIds.length;

    if (index === 0) {
      firstInterimRank = userCumulativeRank;
    }

    finalRank = userCumulativeRank;
    totalPoints += userRacePoints;

    const isPodium = userRaceRank <= 3;
    if (isPodium) {
      podiumCount += 1;
    }

    if (!bestRace || userRacePoints > bestRace.points) {
      bestRace = {
        raceId: toIdString(race._id),
        raceName: race.name || `Rennen ${index + 1}`,
        points: userRacePoints,
      };
    }

    if (!worstRace || userRacePoints < worstRace.points) {
      worstRace = {
        raceId: toIdString(race._id),
        raceName: race.name || `Rennen ${index + 1}`,
        points: userRacePoints,
      };
    }

    return {
      raceId: toIdString(race._id),
      raceName: race.name || `Rennen ${index + 1}`,
      raceIndex: index + 1,
      points: userRacePoints,
      cumulativePoints: cumulativeTotals[userId] || 0,
      raceRank: userRaceRank,
      cumulativeRank: userCumulativeRank,
      isPodium,
    };
  });

  const raceCount = raceDetails.length;
  const topRankCount =
    raceCount > 0
      ? Object.values(buildRanking(cumulativeTotals)).filter((rank) => rank === 1)
          .length
      : 0;
  const top3Rate =
    raceCount > 0 ? Number((podiumCount / raceCount).toFixed(4)) : 0;

  return {
    seasonId: toIdString(season._id),
    seasonName: season.name,
    eventDate: season.eventDate,
    participationStatus: "participated",
    participationLabel: "Teilgenommen",
    includedInOverall: raceCount > 0,
    raceCount,
    totalPoints,
    podiumCount,
    top3Rate,
    bestRace,
    worstRace,
    finalRank: finalRank ?? null,
    rankChange:
      firstInterimRank != null && finalRank != null
        ? firstInterimRank - finalRank
        : null,
    isSeasonWinner: raceCount > 0 && finalRank === 1,
    isSharedSeasonWin: raceCount > 0 && finalRank === 1 && topRankCount > 1,
    races: raceDetails,
  };
};

const buildOverallStats = (seasonStats) => {
  const includedSeasons = seasonStats.filter((season) => season.includedInOverall);

  const totals = {
    completedSeasonsCount: seasonStats.length,
    participatedSeasonsCount: includedSeasons.length,
    seasonsCount: includedSeasons.length,
    raceCount: 0,
    totalPoints: 0,
    podiumCount: 0,
    top3Rate: 0,
    seasonsWon: 0,
    bestRace: null,
    worstRace: null,
  };

  includedSeasons.forEach((season) => {
    totals.raceCount += season.raceCount || 0;
    totals.totalPoints += season.totalPoints || 0;
    totals.podiumCount += season.podiumCount || 0;
    if (season.isSeasonWinner) {
      totals.seasonsWon += 1;
    }

    if (season.bestRace) {
      const candidate = {
        ...season.bestRace,
        seasonId: season.seasonId,
        seasonName: season.seasonName,
      };
      if (!totals.bestRace || candidate.points > totals.bestRace.points) {
        totals.bestRace = candidate;
      }
    }

    if (season.worstRace) {
      const candidate = {
        ...season.worstRace,
        seasonId: season.seasonId,
        seasonName: season.seasonName,
      };
      if (!totals.worstRace || candidate.points < totals.worstRace.points) {
        totals.worstRace = candidate;
      }
    }
  });

  totals.top3Rate =
    totals.raceCount > 0
      ? Number((totals.podiumCount / totals.raceCount).toFixed(4))
      : 0;

  return totals;
};

const computeUserStatsPayload = async ({ userId, completedOnly }) => {
  const seasonDocs = await Season.find({})
    .select("name eventDate participants isCurrent isCompleted")
    .lean();

  const relevantSeasons = selectCompletedSeasons(seasonDocs, completedOnly).sort(
    (a, b) => {
      const dateA = a.eventDate ? new Date(a.eventDate).getTime() : 0;
      const dateB = b.eventDate ? new Date(b.eventDate).getTime() : 0;
      if (dateA !== dateB) return dateA - dateB;
      return String(a._id).localeCompare(String(b._id));
    },
  );

  if (relevantSeasons.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      completedOnly,
      seasons: [],
      overall: buildOverallStats([]),
    };
  }

  const seasonIds = relevantSeasons.map((season) => season._id);
  const raceDocs = await Race.find({ season: { $in: seasonIds } })
    .select("name season results")
    .lean();

  const racesBySeason = new Map();
  raceDocs.forEach((race) => {
    const seasonId = toIdString(race.season);
    if (!seasonId) return;
    if (!racesBySeason.has(seasonId)) {
      racesBySeason.set(seasonId, []);
    }
    racesBySeason.get(seasonId).push(race);
  });

  const seasons = relevantSeasons.map((season) => {
    const seasonId = toIdString(season._id);
    const seasonRaces = (racesBySeason.get(seasonId) || []).sort(sortByObjectIdAsc);
    const participantIds = (season.participants || [])
      .map(toIdString)
      .filter(Boolean);
    const isAssigned = participantIds.includes(userId);

    if (!isAssigned) {
      return buildNotParticipatedSeasonStats({ season, races: seasonRaces });
    }

    return buildSeasonStatsForUser({
      season,
      races: seasonRaces,
      userId,
      participantIds,
    });
  });

  return {
    generatedAt: new Date().toISOString(),
    completedOnly,
    seasons,
    overall: buildOverallStats(seasons),
  };
};

const withSeasonFilter = (statsPayload, seasonId) => {
  if (!seasonId || seasonId === "all") {
    return statsPayload;
  }

  const filteredSeasons = statsPayload.seasons.filter(
    (season) => season.seasonId === seasonId,
  );

  return {
    ...statsPayload,
    seasons: filteredSeasons,
    overall: buildOverallStats(filteredSeasons),
  };
};

export const getUserStatsPayload = async ({
  userId,
  completedOnly = true,
  useCache = true,
  seasonId = null,
}) => {
  const normalizedUserId = toIdString(userId);
  const revision = await getCurrentStatsRevision();

  if (useCache) {
    const cached = await UserStatsCache.findOne({
      user: normalizedUserId,
      completedOnly,
    }).lean();

    if (cached?.revision === revision && cached.payload) {
      return {
        revision,
        cacheHit: true,
        stats: withSeasonFilter(cached.payload, seasonId),
      };
    }
  }

  const payload = await computeUserStatsPayload({
    userId: normalizedUserId,
    completedOnly,
  });

  if (useCache) {
    await UserStatsCache.findOneAndUpdate(
      { user: normalizedUserId, completedOnly },
      { revision, payload },
      { upsert: true, new: true },
    );
  }

  return {
    revision,
    cacheHit: false,
    stats: withSeasonFilter(payload, seasonId),
  };
};
