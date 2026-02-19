import dotenv from "dotenv";
import mongoose from "mongoose";
import PredictionRound from "../models/PredictionRound.js";
import PredictionScore from "../models/PredictionScore.js";
import Race from "../models/Race.js";
import Season from "../models/Season.js";
import User from "../models/User.js";
import UserSeasonTeam from "../models/UserSeasonTeam.js";
import {
  PredictionServiceError,
  createRound,
  overrideUserScore,
  publishRound,
  scoreRoundFromRaceResults,
  syncPredictionsForRace,
  transitionRoundStatus,
  upsertUserEntry,
} from "../services/predictionService.js";

dotenv.config();

const parseArgs = (argv) => {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const nextToken = argv[index + 1];
    if (!nextToken || nextToken.startsWith("--")) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = nextToken;
    index += 1;
  }
  return parsed;
};

const toIdString = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  if (typeof value === "object" && value._id) return toIdString(value._id);
  return String(value);
};

const requireObjectId = (value, label) => {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) {
    throw new Error(`Ungültige ${label}: ${value || "(leer)"}`);
  }
  return new mongoose.Types.ObjectId(value);
};

const resolveSeason = async (seasonArg) => {
  if (seasonArg) {
    const seasonId = requireObjectId(seasonArg, "Season-ID");
    const season = await Season.findById(seasonId);
    if (!season) {
      throw new Error(`Season nicht gefunden: ${seasonArg}`);
    }
    return season;
  }

  const current = await Season.findOne({ isCurrent: true }).sort({ _id: -1 });
  if (current) return current;

  const fallback = await Season.findOne({}).sort({ _id: -1 });
  if (!fallback) {
    throw new Error("Keine Season gefunden.");
  }
  return fallback;
};

const resolveRace = async ({ season, raceArg }) => {
  if (raceArg) {
    const raceId = requireObjectId(raceArg, "Race-ID");
    const race = await Race.findById(raceId);
    if (!race) {
      throw new Error(`Rennen nicht gefunden: ${raceArg}`);
    }
    if (toIdString(race.season) !== toIdString(season._id)) {
      throw new Error(
        "Das angegebene Rennen gehört nicht zur gewählten Season.",
      );
    }
    return race;
  }

  const race = await Race.findOne({ season: season._id }).sort({ _id: 1 });
  if (!race) {
    throw new Error("Keine Rennen für diese Season gefunden.");
  }
  return race;
};

const resolveAdminId = async (adminArg) => {
  if (adminArg) {
    requireObjectId(adminArg, "Admin-ID");
    const admin = await User.findById(adminArg).select(
      "_id role username realname",
    );
    if (!admin) throw new Error("Admin-Benutzer nicht gefunden.");
    if (admin.role !== "admin")
      throw new Error("Die angegebene Admin-ID ist kein Admin.");
    return admin._id;
  }

  const admin = await User.findOne({ role: "admin" }).select("_id");
  if (!admin) {
    throw new Error("Kein Admin-Benutzer gefunden. Bitte --admin angeben.");
  }
  return admin._id;
};

const resolveUserId = async ({ userArg, season }) => {
  if (userArg) {
    requireObjectId(userArg, "User-ID");
    const inSeason = (season.participants || [])
      .map((participant) => toIdString(participant))
      .includes(String(userArg));
    if (!inSeason) {
      throw new Error(
        "Der angegebene User ist nicht Teilnehmer dieser Season.",
      );
    }
    return new mongoose.Types.ObjectId(userArg);
  }

  const participantIds = (season.participants || []).map((participant) =>
    toIdString(participant),
  );
  if (participantIds.length === 0) {
    throw new Error("Season hat keine Teilnehmer.");
  }

  const assignments = await UserSeasonTeam.find({
    season: season._id,
    user: { $in: participantIds.map((id) => new mongoose.Types.ObjectId(id)) },
  }).select("user");

  if (assignments.length === 0) {
    throw new Error("Kein Season-Teilnehmer mit Teamzuweisung gefunden.");
  }

  return assignments[0].user;
};

const resolvePicks = (season, tieBreakerDefault) => {
  const explicitPicks = {
    p1: season?._explicitPicks?.p1 || null,
    p2: season?._explicitPicks?.p2 || null,
    p3: season?._explicitPicks?.p3 || null,
    lastPlace: season?._explicitPicks?.lastPlace || null,
  };
  if (
    explicitPicks.p1 &&
    explicitPicks.p2 &&
    explicitPicks.p3 &&
    explicitPicks.lastPlace
  ) {
    const ids = [
      explicitPicks.p1,
      explicitPicks.p2,
      explicitPicks.p3,
      explicitPicks.lastPlace,
    ];
    const unique = new Set(ids);
    if (unique.size !== ids.length) {
      throw new Error(
        "Explizite Picks müssen unterschiedliche Teams enthalten.",
      );
    }
    return {
      ...explicitPicks,
      tieBreaker: tieBreakerDefault,
    };
  }

  const teamIds = (season.teams || [])
    .map((team) => toIdString(team))
    .filter(Boolean);
  if (teamIds.length < 4) {
    throw new Error(
      "Mindestens 4 Teams in der Season erforderlich, um Picks für p1/p2/p3/lastPlace zu bauen.",
    );
  }

  return {
    p1: teamIds[0],
    p2: teamIds[1],
    p3: teamIds[2],
    lastPlace: teamIds[3],
    tieBreaker: tieBreakerDefault,
  };
};

const loadOrCreateRound = async ({ seasonId, raceId, adminId }) => {
  try {
    const round = await createRound({
      seasonId,
      raceId,
      createdBy: adminId,
    });
    console.log(`[OK] Round erstellt: ${round._id}`);
    return round;
  } catch (error) {
    if (error instanceof PredictionServiceError && error.statusCode === 409) {
      const round = await PredictionRound.findOne({
        season: seasonId,
        race: raceId,
      });
      if (!round) throw error;
      console.log(`[OK] Bestehende Round verwendet: ${round._id}`);
      return round;
    }
    throw error;
  }
};

const ensureStatus = async ({
  round,
  targetStatus,
  adminId,
  reason = null,
}) => {
  const latest = await PredictionRound.findById(round._id);
  if (!latest) throw new Error("Round nicht gefunden.");
  if (latest.status === targetStatus) {
    return latest;
  }

  const next = await transitionRoundStatus({
    roundId: latest._id,
    toStatus: targetStatus,
    changedBy: adminId,
    reason,
    trigger: "smoke_test",
  });
  console.log(`[OK] Status ${latest.status} -> ${next.status}`);
  return next;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.help === true || args.help === "true") {
    console.log("Prediction Smoke-Test");
    console.log("Optionen:");
    console.log(
      "  --season <id>         Season-ID (optional, sonst aktuelle/fallback)",
    );
    console.log(
      "  --race <id>           Race-ID (optional, sonst erstes Rennen der Season)",
    );
    console.log(
      "  --admin <id>          Admin-User-ID (optional, sonst erster Admin)",
    );
    console.log("  --user <id>           User-ID für Entry/Score (optional)");
    console.log(
      "  --p1 <teamId>         Expliziter Team-Pick für P1 (optional)",
    );
    console.log(
      "  --p2 <teamId>         Expliziter Team-Pick für P2 (optional)",
    );
    console.log(
      "  --p3 <teamId>         Expliziter Team-Pick für P3 (optional)",
    );
    console.log(
      "  --lastPlace <teamId>  Expliziter Team-Pick für Last Place (optional)",
    );
    console.log("  --overrideTotal <n>   Optionaler Override-Wert");
    console.log("  --overrideDelta <n>   Delta für Override (Default: 1)");
    console.log("  --forceRescore true   Erzwingt Rescore + Re-Publish");
    console.log("  --dryRun true         Nur lesen, keine Schreiboperationen");
    console.log("");
    console.log(
      "Beispiel: npm --prefix backend run smoke:predictions -- --dryRun true --p1 <id> --p2 <id> --p3 <id> --lastPlace <id>",
    );
    return;
  }

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI fehlt in der Umgebung.");
  }
  await mongoose.connect(process.env.MONGO_URI);

  try {
    const season = await resolveSeason(args.season);
    const race = await resolveRace({ season, raceArg: args.race });
    if (args.p1 && args.p2 && args.p3 && args.lastPlace) {
      requireObjectId(args.p1, "Pick p1 Team-ID");
      requireObjectId(args.p2, "Pick p2 Team-ID");
      requireObjectId(args.p3, "Pick p3 Team-ID");
      requireObjectId(args.lastPlace, "Pick lastPlace Team-ID");
      season._explicitPicks = {
        p1: String(args.p1),
        p2: String(args.p2),
        p3: String(args.p3),
        lastPlace: String(args.lastPlace),
      };
    }
    const adminId = await resolveAdminId(args.admin);
    const userId = await resolveUserId({ userArg: args.user, season });

    const raceTopPoints = Math.max(
      0,
      ...(race.results || []).map(
        (result) => Number(result?.pointsEarned) || 0,
      ),
    );
    const picks = resolvePicks(season, raceTopPoints);
    const isDryRun = args.dryRun === true || args.dryRun === "true";

    console.log(
      `[INFO] Season=${season._id} Race=${race._id} Admin=${adminId} User=${userId}`,
    );
    console.log(`[INFO] Picks=${JSON.stringify(picks)}`);

    if (isDryRun) {
      console.log(
        "[DONE] Dry-Run erfolgreich (keine Schreiboperationen ausgeführt).",
      );
      return;
    }

    let round = await loadOrCreateRound({
      seasonId: season._id,
      raceId: race._id,
      adminId,
    });

    if (["locked", "scored", "published"].includes(round.status)) {
      round = await ensureStatus({
        round,
        targetStatus: "open",
        adminId,
        reason: "Smoke-Test Wiedereröffnung",
      });
    } else if (round.status === "draft") {
      round = await ensureStatus({ round, targetStatus: "open", adminId });
    }

    const entry = await upsertUserEntry({
      roundId: round._id,
      userId,
      picks,
    });
    console.log(`[OK] Entry upserted: ${entry._id}`);

    round = await ensureStatus({ round, targetStatus: "locked", adminId });

    const scoreResult = await scoreRoundFromRaceResults({
      roundId: round._id,
      generatedBy: adminId,
      trigger: "smoke_test",
      force: false,
    });
    console.log(
      `[OK] Score aktualisiert (skipped=${scoreResult.skipped}, updatedScores=${scoreResult.updatedScores})`,
    );

    const userScore = await PredictionScore.findOne({
      roundId: round._id,
      userId,
    }).select("total");
    if (!userScore) {
      throw new Error("Kein User-Score nach Scoring gefunden.");
    }

    const overrideDelta = Number(args.overrideDelta ?? 1);
    const overrideTotal = Number(
      args.overrideTotal ?? userScore.total + overrideDelta,
    );
    await overrideUserScore({
      roundId: round._id,
      userId,
      total: overrideTotal,
      reason: "Smoke-Test Override",
      overrideBy: adminId,
    });
    console.log(`[OK] Score override gesetzt: ${overrideTotal}`);

    round = await publishRound({ roundId: round._id, publishedBy: adminId });
    console.log(`[OK] Round veröffentlicht: ${round.status}`);

    const syncResult = await syncPredictionsForRace({
      raceId: race._id,
      triggerInfo: { triggeredBy: adminId },
    });
    console.log(
      `[OK] Sync ausgeführt: rounds=${syncResult.roundsTotal}, rescored=${syncResult.rescored}, reviewFlagged=${syncResult.reviewFlagged}, unchanged=${syncResult.unchanged}`,
    );

    if (args.forceRescore === true || args.forceRescore === "true") {
      const forced = await scoreRoundFromRaceResults({
        roundId: round._id,
        generatedBy: adminId,
        trigger: "publish_recheck",
        force: true,
        preserveOverrides: true,
      });
      console.log(
        `[OK] Force-Rescore (skipped=${forced.skipped}, updatedScores=${forced.updatedScores})`,
      );
      const republished = await publishRound({
        roundId: round._id,
        publishedBy: adminId,
      });
      console.log(`[OK] Erneut veröffentlicht: ${republished.status}`);
    }

    console.log("[DONE] Prediction Smoke-Test erfolgreich.");
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((error) => {
  console.error("[ERROR] Prediction Smoke-Test fehlgeschlagen.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
