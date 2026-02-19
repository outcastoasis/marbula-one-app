import dotenv from "dotenv";

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

const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const requestJson = async ({
  baseUrl,
  method = "GET",
  path,
  token = null,
  body = null,
  expectedStatuses = [200],
}) => {
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!expectedStatuses.includes(response.status)) {
    const message = isObject(payload)
      ? payload.message || JSON.stringify(payload)
      : "";
    throw new Error(
      `HTTP ${response.status} ${method} ${path} fehlgeschlagen.${message ? ` ${message}` : ""}`,
    );
  }

  return {
    status: response.status,
    payload,
  };
};

const resolveSeasonAndRace = async ({ baseUrl, args }) => {
  let seasonId = args.season || null;
  let seasonPayload = null;

  if (!seasonId) {
    const currentSeasonResponse = await requestJson({
      baseUrl,
      method: "GET",
      path: "/seasons/current",
      expectedStatuses: [200],
    });
    seasonPayload = currentSeasonResponse.payload;
    seasonId = seasonPayload?._id;
  }

  if (!seasonId) {
    throw new Error("Keine Season-ID bestimmbar. Bitte --season angeben.");
  }

  if (!seasonPayload) {
    seasonPayload = (
      await requestJson({
        baseUrl,
        method: "GET",
        path: "/seasons/current",
        expectedStatuses: [200, 404],
      })
    ).payload;
  }

  let raceId = args.race || null;
  if (!raceId) {
    const racesResponse = await requestJson({
      baseUrl,
      method: "GET",
      path: `/races/season/${seasonId}`,
      expectedStatuses: [200],
    });
    const races = Array.isArray(racesResponse.payload)
      ? racesResponse.payload
      : [];
    if (races.length === 0) {
      throw new Error(
        "Keine Rennen für die Season gefunden. Bitte --race angeben.",
      );
    }
    raceId = races[0]._id;
  }

  if (!raceId) {
    throw new Error("Keine Race-ID bestimmbar.");
  }

  return { seasonId, raceId, seasonPayload };
};

const buildPicks = ({ args, seasonPayload }) => {
  if (args.p1 && args.p2 && args.p3 && args.lastPlace) {
    const unique = new Set([args.p1, args.p2, args.p3, args.lastPlace]);
    if (unique.size !== 4) {
      throw new Error(
        "Die expliziten Picks muessen unterschiedliche Team-IDs sein.",
      );
    }
    return {
      p1: args.p1,
      p2: args.p2,
      p3: args.p3,
      lastPlace: args.lastPlace,
      tieBreaker: Number(args.tieBreaker ?? 10),
    };
  }

  const teams = Array.isArray(seasonPayload?.teams) ? seasonPayload.teams : [];
  const teamIds = teams
    .map((team) => (isObject(team) ? team._id : team))
    .filter(Boolean)
    .map(String);

  if (teamIds.length < 4) {
    throw new Error(
      "Season hat weniger als 4 Teams. Nutze --p1 --p2 --p3 --lastPlace fuer explizite Picks.",
    );
  }

  return {
    p1: teamIds[0],
    p2: teamIds[1],
    p3: teamIds[2],
    lastPlace: teamIds[3],
    tieBreaker: Number(args.tieBreaker ?? 10),
  };
};

const login = async ({ baseUrl, username, password }) => {
  if (!username || !password) {
    throw new Error("Login-Daten fehlen (username/password).");
  }
  const response = await requestJson({
    baseUrl,
    method: "POST",
    path: "/auth/login",
    body: { username, password },
    expectedStatuses: [200],
  });

  const token = response.payload?.token;
  if (!token) {
    throw new Error("Login erfolgreich, aber kein Token erhalten.");
  }
  return token;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.help === true || args.help === "true") {
    console.log("Prediction API Smoke-Test");
    console.log("Voraussetzung: Backend-Server läuft.");
    console.log("Optionen:");
    console.log(
      "  --baseUrl <url>           Default: http://localhost:5000/api",
    );
    console.log(
      "  --adminUser <name>        Admin Username (oder ENV SMOKE_ADMIN_USER)",
    );
    console.log(
      "  --adminPass <pw>          Admin Passwort (oder ENV SMOKE_ADMIN_PASS)",
    );
    console.log(
      "  --userUser <name>         User Username (optional, sonst Admin)",
    );
    console.log(
      "  --userPass <pw>           User Passwort (optional, sonst Admin)",
    );
    console.log("  --season <id>             Season-ID (optional)");
    console.log("  --race <id>               Race-ID (optional)");
    console.log("  --p1/p2/p3/lastPlace <id> Explizite Team-Picks (optional)");
    console.log(
      "  --tieBreaker <n>          Tie-Breaker (optional, Default 10)",
    );
    console.log("  --dryRun true             Nur Login + Read-Checks");
    console.log("");
    console.log(
      "Beispiel: npm --prefix backend run smoke:predictions:api -- --adminUser admin --adminPass secret --dryRun true",
    );
    return;
  }

  const baseUrl = String(
    args.baseUrl || process.env.SMOKE_BASE_URL || "http://localhost:5000/api",
  ).replace(/\/+$/, "");
  const adminUser = args.adminUser || process.env.SMOKE_ADMIN_USER;
  const adminPass = args.adminPass || process.env.SMOKE_ADMIN_PASS;
  const userUser = args.userUser || process.env.SMOKE_USER_USER || adminUser;
  const userPass = args.userPass || process.env.SMOKE_USER_PASS || adminPass;
  const isDryRun = args.dryRun === true || args.dryRun === "true";

  console.log(`[INFO] Base URL: ${baseUrl}`);

  const adminToken = await login({
    baseUrl,
    username: adminUser,
    password: adminPass,
  });
  console.log("[OK] Admin-Login erfolgreich.");

  const userToken = await login({
    baseUrl,
    username: userUser,
    password: userPass,
  });
  console.log("[OK] User-Login erfolgreich.");

  const { seasonId, raceId, seasonPayload } = await resolveSeasonAndRace({
    baseUrl,
    args,
  });
  console.log(`[OK] Season=${seasonId} Race=${raceId}`);

  const picks = buildPicks({ args, seasonPayload });
  console.log(`[OK] Picks vorbereitet: ${JSON.stringify(picks)}`);

  await requestJson({
    baseUrl,
    method: "GET",
    path: "/predictions/admin/rounds",
    token: adminToken,
    expectedStatuses: [200],
  });
  await requestJson({
    baseUrl,
    method: "GET",
    path: "/predictions/rounds",
    token: userToken,
    expectedStatuses: [200],
  });
  console.log("[OK] Read-Endpunkte erreichbar.");

  if (isDryRun) {
    console.log("[DONE] Dry-Run erfolgreich (keine Schreiboperationen).");
    return;
  }

  let roundId = null;
  try {
    const createRoundResponse = await requestJson({
      baseUrl,
      method: "POST",
      path: "/predictions/admin/rounds",
      token: adminToken,
      body: { seasonId, raceId },
      expectedStatuses: [201],
    });
    roundId = createRoundResponse.payload?._id;
    console.log(`[OK] Round erstellt: ${roundId}`);
  } catch (error) {
    if (!String(error.message || "").includes("409")) {
      throw error;
    }
    const roundsResponse = await requestJson({
      baseUrl,
      method: "GET",
      path: `/predictions/admin/rounds?seasonId=${seasonId}&raceId=${raceId}`,
      token: adminToken,
      expectedStatuses: [200],
    });
    const rounds = Array.isArray(roundsResponse.payload)
      ? roundsResponse.payload
      : [];
    roundId = rounds[0]?._id || null;
    if (!roundId) {
      throw new Error("Round konnte weder erstellt noch gefunden werden.");
    }
    console.log(`[OK] Bestehende Round verwendet: ${roundId}`);
  }

  const setStatus = async (toStatus, reason = null) => {
    await requestJson({
      baseUrl,
      method: "PATCH",
      path: `/predictions/admin/rounds/${roundId}/status`,
      token: adminToken,
      body: { toStatus, reason },
      expectedStatuses: [200],
    });
    console.log(`[OK] Round-Status gesetzt: ${toStatus}`);
  };

  await setStatus("open", "API Smoke-Test Reopen/Start");
  await requestJson({
    baseUrl,
    method: "PUT",
    path: `/predictions/rounds/${roundId}/entry`,
    token: userToken,
    body: { picks },
    expectedStatuses: [200],
  });
  console.log("[OK] User-Entry gespeichert.");

  await setStatus("locked");
  await requestJson({
    baseUrl,
    method: "POST",
    path: `/predictions/admin/rounds/${roundId}/score`,
    token: adminToken,
    body: { trigger: "api_smoke" },
    expectedStatuses: [200],
  });
  console.log("[OK] Round gescored.");

  await requestJson({
    baseUrl,
    method: "POST",
    path: `/predictions/admin/rounds/${roundId}/publish`,
    token: adminToken,
    expectedStatuses: [200],
  });
  console.log("[OK] Round veröffentlicht.");

  await requestJson({
    baseUrl,
    method: "GET",
    path: "/predictions/me",
    token: userToken,
    expectedStatuses: [200],
  });
  console.log("[OK] User-History abrufbar.");

  console.log("[DONE] Prediction API Smoke-Test erfolgreich.");
};

main().catch((error) => {
  console.error("[ERROR] Prediction API Smoke-Test fehlgeschlagen.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
