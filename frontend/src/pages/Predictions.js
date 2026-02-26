import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import API from "../api";
import { useToast } from "../context/ToastContext";
import "../styles/Predictions.css";

const STATUS_OPTIONS = [
  { value: "", label: "Alle" },
  { value: "open", label: "open" },
  { value: "locked", label: "locked" },
  { value: "scored", label: "scored" },
  { value: "published", label: "published" },
];

const DEFAULT_ENTRY_FORM = {
  p1: "",
  p2: "",
  p3: "",
  lastPlace: "",
};

const DEFAULT_HISTORY = {
  rows: [],
  summary: {
    totalRounds: 0,
    totalPoints: 0,
    publishedRounds: 0,
    publishedPoints: 0,
  },
};

const PICK_ORDER = [
  { key: "p1", label: "1. Platz", kind: "top3" },
  { key: "p2", label: "2. Platz", kind: "top3" },
  { key: "p3", label: "3. Platz", kind: "top3" },
  { key: "lastPlace", label: "Letzter Platz", kind: "last" },
];

const asArray = (value) => (Array.isArray(value) ? value : []);

const getApiErrorMessage = (error, fallback) =>
  error?.response?.data?.message || fallback;

const getId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
};

const getDisplayName = (entity) => {
  if (!entity || typeof entity !== "object") return "-";
  if (typeof entity.name === "string" && entity.name.trim()) return entity.name.trim();
  if (typeof entity.realname === "string" && entity.realname.trim()) {
    return entity.realname.trim();
  }
  if (typeof entity.username === "string" && entity.username.trim()) {
    return entity.username.trim();
  }
  return "-";
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.toLocaleDateString("de-CH")} ${date.toLocaleTimeString("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const formatPoints = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
};

const getStatusBadgeClass = (status) => {
  if (status === "open") return "is-open";
  if (status === "locked") return "is-locked";
  if (status === "scored") return "is-scored";
  if (status === "published") return "is-published";
  return "is-draft";
};

const normalizeScoringConfig = (config) => ({
  exactPositionPoints: Number(config?.exactPositionPoints ?? 6),
  top3AnyPositionPoints: Number(config?.top3AnyPositionPoints ?? 3),
  exactLastPlacePoints: Number(config?.exactLastPlacePoints ?? 4),
});

const BREAKDOWN_LABELS = {
  exact_p1: "1. Platz exakt getroffen",
  exact_p2: "2. Platz exakt getroffen",
  exact_p3: "3. Platz exakt getroffen",
  top3_any_position_p1: "1. Platz: Team in Top 3",
  top3_any_position_p2: "2. Platz: Team in Top 3",
  top3_any_position_p3: "3. Platz: Team in Top 3",
  exact_last_place: "Letzter Platz exakt",
};

const isTechnicalToken = (value) =>
  typeof value === "string" && /^[a-z0-9_]+$/i.test(value.trim());

const getBreakdownLabel = (row) => {
  const label = typeof row?.label === "string" ? row.label.trim() : "";
  const code = typeof row?.code === "string" ? row.code.trim() : "";

  if (label && !isTechnicalToken(label)) return label;
  if (label && BREAKDOWN_LABELS[label]) return BREAKDOWN_LABELS[label];
  if (code && BREAKDOWN_LABELS[code]) return BREAKDOWN_LABELS[code];
  if (label) return "Treffer";
  return "Scoring-Treffer";
};

const getPickResultState = ({ slotKey, predictedId, actual, actualTop3Ids }) => {
  if (!predictedId) {
    return { tone: "neutral", label: "Nicht getippt" };
  }

  const actualId = getId(actual?.[slotKey]);
  if (predictedId && actualId && predictedId === actualId) {
    return { tone: "success", label: "Richtig" };
  }

  if (slotKey !== "lastPlace" && actualTop3Ids.has(predictedId)) {
    return { tone: "warning", label: "Top 3, falsche Position" };
  }

  return { tone: "danger", label: "Falsch" };
};

export default function Predictions() {
  const toast = useToast();
  const loadingSeasonAssignmentsRef = useRef(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [filters, setFilters] = useState({
    seasonId: "",
    raceId: "",
    status: "",
  });

  const [allSeasons, setAllSeasons] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [seasonAssignmentsBySeasonId, setSeasonAssignmentsBySeasonId] = useState({});
  const [rounds, setRounds] = useState([]);
  const [selectedRoundId, setSelectedRoundId] = useState("");
  const [roundDetails, setRoundDetails] = useState(null);
  const [entryForm, setEntryForm] = useState(DEFAULT_ENTRY_FORM);
  const [historyPayload, setHistoryPayload] = useState(DEFAULT_HISTORY);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [error, setError] = useState("");

  const seasonById = useMemo(() => {
    const map = new Map();
    allSeasons.forEach((season) => {
      map.set(String(season._id), season);
    });
    return map;
  }, [allSeasons]);

  const teamById = useMemo(() => {
    const map = new Map();
    allTeams.forEach((team) => {
      map.set(String(team._id), team);
    });
    return map;
  }, [allTeams]);

  const selectedRound = useMemo(() => {
    if (roundDetails?.round?._id) return roundDetails.round;
    return rounds.find((round) => String(round._id) === String(selectedRoundId)) || null;
  }, [roundDetails, rounds, selectedRoundId]);
  const selectedRoundSeasonId = getId(selectedRound?.season?._id || selectedRound?.season);

  const scoringConfig = useMemo(
    () => normalizeScoringConfig(selectedRound?.scoringConfig || {}),
    [selectedRound?.scoringConfig],
  );
  const teamOwnerBySeasonAndTeam = useMemo(() => {
    const map = new Map();
    Object.entries(seasonAssignmentsBySeasonId).forEach(([seasonId, assignments]) => {
      const teamMap = new Map();
      asArray(assignments).forEach((assignment) => {
        const teamId = getId(assignment?.team);
        if (!teamId) return;
        const ownerName = getDisplayName(assignment?.user);
        if (ownerName && ownerName !== "-") {
          teamMap.set(teamId, ownerName);
        }
      });
      map.set(String(seasonId), teamMap);
    });
    return map;
  }, [seasonAssignmentsBySeasonId]);

  const scoringRuleItems = useMemo(() => {
    return [
      `1./2./3. Platz exakt: +${formatPoints(scoringConfig.exactPositionPoints)} pro Treffer`,
      `Top 3 richtig, aber falsche Position: +${formatPoints(scoringConfig.top3AnyPositionPoints)}`,
      `Letzter Platz exakt: +${formatPoints(scoringConfig.exactLastPlacePoints)}`,
    ];
  }, [scoringConfig]);

  const roundTeamOptions = useMemo(() => {
    const seasonId = selectedRoundSeasonId;
    if (!seasonId) return [];
    const season = seasonById.get(seasonId);
    if (!season) return [];
    const ownerMap = teamOwnerBySeasonAndTeam.get(seasonId) || new Map();
    const teamIds = asArray(season.teams).map((team) => getId(team)).filter(Boolean);
    return teamIds
      .map((teamId) => ({
        _id: teamId,
        name: getDisplayName(teamById.get(teamId)),
        ownerName: ownerMap.get(teamId) || "",
      }))
      .map((team) => ({
        ...team,
        displayName: team.ownerName ? `${team.name} (${team.ownerName})` : team.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "de-CH"));
  }, [seasonById, selectedRoundSeasonId, teamById, teamOwnerBySeasonAndTeam]);

  const availableRaceOptions = useMemo(() => {
    const raceMap = new Map();
    rounds.forEach((round) => {
      const race = round?.race;
      const raceId = getId(race?._id || race);
      if (!raceId || raceMap.has(raceId)) return;
      raceMap.set(raceId, {
        _id: raceId,
        name: getDisplayName(race),
      });
    });
    return [...raceMap.values()];
  }, [rounds]);

  const myScore = roundDetails?.myScore || null;
  const breakdownRows = asArray(myScore?.breakdown);
  const sumBreakdown = breakdownRows.reduce(
    (sum, row) => sum + (Number(row?.points) || 0),
    0,
  );
  const canEditEntry = selectedRound?.status === "open";
  const publishedHistoryRows = useMemo(
    () =>
      asArray(historyPayload?.rows).filter(
        (row) => String(row?.round?.status || "") === "published",
      ),
    [historyPayload],
  );

  const resolveTeamName = useCallback((value, seasonId = selectedRoundSeasonId) => {
    if (!value) return "-";
    const teamId = getId(value);
    const ownerName =
      (seasonId && teamOwnerBySeasonAndTeam.get(String(seasonId))?.get(teamId)) || "";
    const baseName =
      typeof value === "object" && value.name
        ? value.name
        : getDisplayName(teamById.get(teamId));
    if (!baseName || baseName === "-") return "-";
    return ownerName ? `${baseName} (${ownerName})` : baseName;
  }, [selectedRoundSeasonId, teamById, teamOwnerBySeasonAndTeam]);
  const scoreComparisonRows = useMemo(() => {
    if (!myScore) return [];

    const actualTop3Ids = new Set(
      ["p1", "p2", "p3"].map((key) => getId(myScore?.actual?.[key])).filter(Boolean),
    );

    return PICK_ORDER.map((pick) => {
      const predictedId = getId(myScore?.predicted?.[pick.key]);
      const actualId = getId(myScore?.actual?.[pick.key]);
      const result = getPickResultState({
        slotKey: pick.key,
        predictedId,
        actual: myScore?.actual,
        actualTop3Ids,
      });

      return {
        key: pick.key,
        label: pick.label,
        predictedId,
        actualId,
        predictedName: resolveTeamName(myScore?.predicted?.[pick.key]),
        actualName: resolveTeamName(myScore?.actual?.[pick.key]),
        result,
      };
    });
  }, [myScore, resolveTeamName]);

  const syncEntryFormFromDetails = useCallback((details) => {
    const picks = details?.myEntry?.picks;
    if (!picks) {
      setEntryForm(DEFAULT_ENTRY_FORM);
      return;
    }
    setEntryForm({
      p1: getId(picks.p1),
      p2: getId(picks.p2),
      p3: getId(picks.p3),
      lastPlace: getId(picks.lastPlace),
    });
  }, []);

  const loadMetaData = useCallback(async () => {
    const [seasonRes, teamsRes] = await Promise.all([
      API.get("/seasons"),
      API.get("/teams"),
    ]);
    setAllSeasons(asArray(seasonRes.data));
    setAllTeams(asArray(teamsRes.data));
  }, []);

  const loadSeasonAssignments = useCallback(async (seasonId) => {
    const normalizedSeasonId = getId(seasonId);
    if (!normalizedSeasonId) return;
    if (loadingSeasonAssignmentsRef.current.has(normalizedSeasonId)) return;
    if (Object.prototype.hasOwnProperty.call(seasonAssignmentsBySeasonId, normalizedSeasonId)) {
      return;
    }
    loadingSeasonAssignmentsRef.current.add(normalizedSeasonId);

    try {
      const response = await API.get(`/userSeasonTeams?season=${normalizedSeasonId}`);
      setSeasonAssignmentsBySeasonId((prev) => ({
        ...prev,
        [normalizedSeasonId]: asArray(response.data),
      }));
    } catch (assignmentError) {
      console.error("Fehler beim Laden der Teamzuweisungen der Season:", assignmentError);
      setSeasonAssignmentsBySeasonId((prev) => ({
        ...prev,
        [normalizedSeasonId]: [],
      }));
    } finally {
      loadingSeasonAssignmentsRef.current.delete(normalizedSeasonId);
    }
  }, [seasonAssignmentsBySeasonId]);

  const loadRounds = useCallback(async () => {
    const params = {};
    if (filters.seasonId) params.seasonId = filters.seasonId;
    if (filters.raceId) params.raceId = filters.raceId;
    if (filters.status) params.status = filters.status;

    const roundsRes = await API.get("/predictions/rounds", { params });
    const nextRounds = asArray(roundsRes.data);
    setRounds(nextRounds);

    if (nextRounds.length === 0) {
      setSelectedRoundId("");
      setRoundDetails(null);
      setEntryForm(DEFAULT_ENTRY_FORM);
      return;
    }

    setSelectedRoundId((prev) => {
      const stillAvailable = nextRounds.some(
        (round) => String(round._id) === String(prev),
      );
      if (!prev || !stillAvailable) {
        return String(nextRounds[0]._id);
      }
      return prev;
    });
  }, [filters.raceId, filters.seasonId, filters.status]);

  const loadRoundDetails = useCallback(async () => {
    if (!selectedRoundId) {
      setRoundDetails(null);
      setEntryForm(DEFAULT_ENTRY_FORM);
      return;
    }

    const detailsRes = await API.get(`/predictions/rounds/${selectedRoundId}`);
    const details = detailsRes.data || null;
    setRoundDetails(details);
    syncEntryFormFromDetails(details);
  }, [selectedRoundId, syncEntryFormFromDetails]);

  const loadHistory = useCallback(async () => {
    const params = {};
    if (filters.seasonId) params.seasonId = filters.seasonId;
    const historyRes = await API.get("/predictions/me", { params });
    setHistoryPayload(historyRes.data || DEFAULT_HISTORY);
  }, [filters.seasonId]);

  const refreshListAndHistory = useCallback(async () => {
    await Promise.all([loadRounds(), loadHistory()]);
  }, [loadHistory, loadRounds]);

  const refreshAll = useCallback(async () => {
    await refreshListAndHistory();
    await loadRoundDetails();
  }, [loadRoundDetails, refreshListAndHistory]);

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      setError("");
      try {
        await loadMetaData();
      } catch (loadError) {
        console.error("Fehler beim Laden der Meta-Daten:", loadError);
        setError(
          getApiErrorMessage(loadError, "Meta-Daten konnten nicht geladen werden."),
        );
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [loadMetaData]);

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      setError("");
      try {
        await refreshListAndHistory();
      } catch (loadError) {
        console.error("Fehler beim Laden der Rundenliste:", loadError);
        setError(getApiErrorMessage(loadError, "Tippspiel-Runden konnten nicht geladen werden."));
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [refreshListAndHistory]);

  useEffect(() => {
    const run = async () => {
      try {
        await loadRoundDetails();
      } catch (loadError) {
        console.error("Fehler beim Laden der Round-Details:", loadError);
        toast.error(
          getApiErrorMessage(loadError, "Round-Details konnten nicht geladen werden."),
        );
      }
    };
    run();
  }, [loadRoundDetails, selectedRoundId, toast]);

  useEffect(() => {
    if (!selectedRoundSeasonId) return;
    loadSeasonAssignments(selectedRoundSeasonId);
  }, [loadSeasonAssignments, selectedRoundSeasonId]);

  const validateEntry = () => {
    const values = [entryForm.p1, entryForm.p2, entryForm.p3, entryForm.lastPlace];
    if (values.some((value) => !value)) {
      return "Bitte alle Picks ausfüllen.";
    }
    if (new Set(values).size !== values.length) {
      return "Ein Team darf im Tipp nur einmal vorkommen.";
    }
    return "";
  };

  const handleSaveEntry = async () => {
    if (!selectedRoundId) return;

    const validationMessage = validateEntry();
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    setIsSavingEntry(true);
    try {
      await API.put(`/predictions/rounds/${selectedRoundId}/entry`, {
        picks: {
          p1: entryForm.p1,
          p2: entryForm.p2,
          p3: entryForm.p3,
          lastPlace: entryForm.lastPlace,
        },
      });
      toast.success("Tipp gespeichert.");
      await refreshAll();
    } catch (saveError) {
      console.error("Fehler beim Speichern des Tipps:", saveError);
      toast.error(
        getApiErrorMessage(saveError, "Tipp konnte nicht gespeichert werden."),
      );
    } finally {
      setIsSavingEntry(false);
    }
  };

  return (
    <div className="predictions-page">
      <header className="predictions-header">
        <h1>Tippspiele</h1>
        <p>Tippe Top 3 und letzter Platz pro Runde.</p>
      </header>

      <section className="predictions-panel">
        <h2>Filter</h2>
        <div className="predictions-filters">
          <label className="predictions-field">
            <span>Season</span>
            <select
              value={filters.seasonId}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  seasonId: event.target.value,
                  raceId: "",
                }))
              }
            >
              <option value="">Alle</option>
              {allSeasons.map((season) => (
                <option key={season._id} value={season._id}>
                  {season.name}
                </option>
              ))}
            </select>
          </label>
          <label className="predictions-field">
            <span>Rennen</span>
            <select
              value={filters.raceId}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, raceId: event.target.value }))
              }
            >
              <option value="">Alle</option>
              {availableRaceOptions.map((race) => (
                <option key={race._id} value={race._id}>
                  {race.name}
                </option>
              ))}
            </select>
          </label>
          <label className="predictions-field">
            <span>Status</span>
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, status: event.target.value }))
              }
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {error ? (
        <section className="predictions-panel predictions-panel-error">
          <p>{error}</p>
        </section>
      ) : null}

      <div className="predictions-grid">
        <section className="predictions-panel">
          <h2>Runden</h2>
          {isLoading ? (
            <p className="predictions-inline-state">Lade Runden...</p>
          ) : rounds.length === 0 ? (
            <p className="predictions-inline-state">Keine Runden gefunden.</p>
          ) : (
            <div className="predictions-round-list">
              {rounds.map((round) => {
                const roundId = String(round._id);
                const isActive = roundId === String(selectedRoundId);
                const statusClass = getStatusBadgeClass(round.status);
                return (
                  <button
                    type="button"
                    key={roundId}
                    className={`predictions-round-item ${isActive ? "is-active" : ""}`}
                    onClick={() => setSelectedRoundId(roundId)}
                  >
                    <div className="predictions-round-top">
                      <strong>{getDisplayName(round.race)}</strong>
                      <span className={`predictions-status-badge ${statusClass}`}>
                        {round.status}
                      </span>
                    </div>
                    <span>{getDisplayName(round.season)}</span>
                    <span>
                      Mein Punktestand:{" "}
                      {round?.myScore?.total === undefined || round?.myScore?.total === null
                        ? "-"
                        : formatPoints(round.myScore.total)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="predictions-panel">
          <h2>Dein Tipp</h2>
          {!selectedRound ? (
            <p className="predictions-inline-state">Wähle eine Runde aus.</p>
          ) : (
            <>
              <div className="predictions-round-meta">
                <p>
                  <strong>Rennen:</strong> {getDisplayName(selectedRound.race)}
                </p>
                <p>
                  <strong>Season:</strong> {getDisplayName(selectedRound.season)}
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  <span
                    className={`predictions-status-badge ${getStatusBadgeClass(
                      selectedRound.status,
                    )}`}
                  >
                    {selectedRound.status}
                  </span>
                </p>
                <p>
                  <strong>Zuletzt gespeichert:</strong>{" "}
                  {formatDateTime(roundDetails?.myEntry?.submittedAt)}
                </p>
              </div>

              <div className="predictions-scoring-inline">
                <p className="predictions-subline">
                  <strong>Aktuelle Punkteverteilung (dieses Rennen):</strong>
                </p>
                <ul className="predictions-rules-compact">
                  {scoringRuleItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="predictions-picks-grid">
                <label className="predictions-field">
                  <span>1. Platz</span>
                  <select
                    disabled={!canEditEntry}
                    value={entryForm.p1}
                    onChange={(event) =>
                      setEntryForm((prev) => ({ ...prev, p1: event.target.value }))
                    }
                  >
                    <option value="">Bitte wählen</option>
                    {roundTeamOptions.map((team) => (
                      <option key={team._id} value={team._id}>
                        {team.displayName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="predictions-field">
                  <span>2. Platz</span>
                  <select
                    disabled={!canEditEntry}
                    value={entryForm.p2}
                    onChange={(event) =>
                      setEntryForm((prev) => ({ ...prev, p2: event.target.value }))
                    }
                  >
                    <option value="">Bitte wählen</option>
                    {roundTeamOptions.map((team) => (
                      <option key={team._id} value={team._id}>
                        {team.displayName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="predictions-field">
                  <span>3. Platz</span>
                  <select
                    disabled={!canEditEntry}
                    value={entryForm.p3}
                    onChange={(event) =>
                      setEntryForm((prev) => ({ ...prev, p3: event.target.value }))
                    }
                  >
                    <option value="">Bitte wählen</option>
                    {roundTeamOptions.map((team) => (
                      <option key={team._id} value={team._id}>
                        {team.displayName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="predictions-field">
                  <span>Letzter Platz</span>
                  <select
                    disabled={!canEditEntry}
                    value={entryForm.lastPlace}
                    onChange={(event) =>
                      setEntryForm((prev) => ({ ...prev, lastPlace: event.target.value }))
                    }
                  >
                    <option value="">Bitte wählen</option>
                    {roundTeamOptions.map((team) => (
                      <option key={team._id} value={team._id}>
                        {team.displayName}
                      </option>
                    ))}
                  </select>
                </label>

              </div>

              <div className="predictions-actions">
                <button
                  type="button"
                  className="predictions-button primary"
                  onClick={handleSaveEntry}
                  disabled={!canEditEntry || isSavingEntry}
                >
                  {isSavingEntry ? "Speichern..." : "Tipp speichern"}
                </button>
                {!canEditEntry ? (
                  <span className="predictions-inline-note">
                    Bearbeiten nur im Status open.
                  </span>
                ) : null}
              </div>
            </>
          )}
        </section>
      </div>

      <section className="predictions-panel">
        <h2>Punkteberechnung dieser Runde</h2>
        {!myScore ? (
          <p className="predictions-inline-state">
            Noch kein Punktestand vorhanden. Sobald geprüft wurde, siehst du hier die Berechnung.
          </p>
        ) : (
          <>
            <div className="predictions-score-summary">
              <article>
                <p>Total</p>
                <strong>{formatPoints(myScore.total)}</strong>
              </article>
              <article>
                <p>Trefferpunkte</p>
                <strong>{formatPoints(sumBreakdown)}</strong>
              </article>
              <article>
                <p>Rundenrang</p>
                <strong>{roundDetails?.myPlacement ?? "-"}</strong>
              </article>
            </div>

            <div className="predictions-comparison-card">
              <h3>Getippt vs. Tatsächlich</h3>
              <div className="predictions-comparison-list">
                {scoreComparisonRows.map((row) => (
                  <div key={row.key} className="predictions-comparison-row">
                    <div className="predictions-comparison-slot">
                      <strong>{row.label}</strong>
                      <span
                        className={`predictions-result-pill is-${row.result.tone}`}
                      >
                        {row.result.label}
                      </span>
                    </div>
                    <div className="predictions-comparison-values">
                      <p>
                        <span>Getippt</span>
                        <strong>{row.predictedName}</strong>
                      </p>
                      <p>
                        <span>Tatsächlich</span>
                        <strong>{row.actualName}</strong>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="predictions-table-wrap">
              <table className="predictions-table">
                <thead>
                  <tr>
                    <th>Treffer</th>
                    <th>Punkte</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdownRows.length === 0 ? (
                    <tr>
                      <td colSpan={2}>Keine Treffereinträge in der Breakdown-Liste.</td>
                    </tr>
                  ) : (
                    breakdownRows.map((row, index) => (
                      <tr key={`${row.code || "row"}-${index}`}>
                        <td>{getBreakdownLabel(row)}</td>
                        <td>{formatPoints(row.points)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="predictions-panel">
        <div className="predictions-panel-head">
          <h2>Meine Tippspiel-History</h2>
          <button
            type="button"
            className="predictions-toggle-button"
            onClick={() => setIsHistoryOpen((prev) => !prev)}
            aria-expanded={isHistoryOpen}
            aria-controls="predictions-history-content"
          >
            <span>{isHistoryOpen ? "-" : "+"}</span>
            <span>{isHistoryOpen ? "Einklappen" : "Ausklappen"}</span>
          </button>
        </div>

        {!isHistoryOpen ? (
          <p className="predictions-inline-state">
            Nur veröffentlichte Runden werden in der History angezeigt.
          </p>
        ) : (
          <div id="predictions-history-content">
            <div className="predictions-kpi-grid predictions-kpi-grid-compact">
              <article className="predictions-kpi">
                <p>Veröffentlichte Runden</p>
                <strong>{historyPayload?.summary?.publishedRounds ?? 0}</strong>
              </article>
              <article className="predictions-kpi">
                <p>Veröffentlichte Punkte</p>
                <strong>
                  {formatPoints(historyPayload?.summary?.publishedPoints ?? 0)}
                </strong>
              </article>
            </div>

            <div className="predictions-table-wrap">
              <table className="predictions-table">
                <thead>
                  <tr>
                    <th>Season</th>
                    <th>Rennen</th>
                    <th>Punkte</th>
                    <th>Rundenrang</th>
                  </tr>
                </thead>
                <tbody>
                  {publishedHistoryRows.length === 0 ? (
                    <tr>
                      <td colSpan={4}>Noch keine veröffentlichte Tippspiel-History vorhanden.</td>
                    </tr>
                  ) : (
                    publishedHistoryRows.map((row) => (
                      <tr key={`${row?.round?._id}-${row?.placement || "na"}`}>
                        <td>{getDisplayName(row?.round?.season)}</td>
                        <td>{getDisplayName(row?.round?.race)}</td>
                        <td>{formatPoints(row?.score?.total)}</td>
                        <td>{row?.placement ?? "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
