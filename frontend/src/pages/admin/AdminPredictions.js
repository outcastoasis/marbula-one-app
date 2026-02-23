import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../../api";
import { useToast } from "../../context/ToastContext";
import "../../styles/AdminPredictions.css";

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Alle" },
  { value: "draft", label: "draft" },
  { value: "open", label: "open" },
  { value: "locked", label: "locked" },
  { value: "scored", label: "scored" },
  { value: "published", label: "published" },
];

const TRANSITION_OPTIONS = [
  { value: "open", label: "Zu open" },
  { value: "locked", label: "Zu locked" },
  { value: "scored", label: "Zu scored" },
  { value: "published", label: "Zu published" },
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
  if (typeof entity.name === "string" && entity.name.trim())
    return entity.name.trim();
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
  return `${date.toLocaleDateString("de-CH")} ${date.toLocaleTimeString(
    "de-CH",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  )}`;
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

export default function AdminPredictions() {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");

  const [seasons, setSeasons] = useState([]);
  const [racesForCreateSeason, setRacesForCreateSeason] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [roundDetails, setRoundDetails] = useState(null);
  const [selectedRoundId, setSelectedRoundId] = useState("");

  const [filters, setFilters] = useState({
    seasonId: "",
    raceId: "",
    status: "",
  });
  const [createForm, setCreateForm] = useState({
    seasonId: "",
    raceId: "",
  });
  const [statusForm, setStatusForm] = useState({
    toStatus: "",
    reason: "",
  });
  const [overrideForm, setOverrideForm] = useState({
    userId: "",
    total: "",
    reason: "",
  });
  const [inspectorUserId, setInspectorUserId] = useState("");

  const selectedRound = useMemo(() => {
    if (roundDetails?.round?._id) return roundDetails.round;
    return (
      rounds.find((round) => String(round._id) === String(selectedRoundId)) ||
      null
    );
  }, [roundDetails, rounds, selectedRoundId]);

  const scoringConfig = useMemo(
    () => normalizeScoringConfig(selectedRound?.scoringConfig || {}),
    [selectedRound?.scoringConfig],
  );
  const scoringRuleItems = useMemo(() => {
    return [
      `P1, P2, P3 exakt: +${formatPoints(scoringConfig.exactPositionPoints)} pro Treffer`,
      `Top 3 richtig, aber falsche Position: +${formatPoints(scoringConfig.top3AnyPositionPoints)}`,
      `Letzter Platz exakt: +${formatPoints(scoringConfig.exactLastPlacePoints)}`,
    ];
  }, [scoringConfig]);

  const availableRaceFilters = useMemo(() => {
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

  const scoreRows = asArray(roundDetails?.scores);
  const entryRows = asArray(roundDetails?.entries);
  const overriddenScores = useMemo(
    () => scoreRows.filter((score) => score?.isOverridden),
    [scoreRows],
  );

  const selectedScore = useMemo(() => {
    if (scoreRows.length === 0) return null;
    const match = scoreRows.find(
      (score) => getId(score.userId) === String(inspectorUserId),
    );
    return match || scoreRows[0];
  }, [inspectorUserId, scoreRows]);

  const loadSeasons = useCallback(async () => {
    const seasonsRes = await API.get("/seasons");
    const loadedSeasons = asArray(seasonsRes.data).sort((a, b) =>
      String(b?.eventDate || "").localeCompare(String(a?.eventDate || "")),
    );
    setSeasons(loadedSeasons);
  }, []);

  const loadRacesForCreateSeason = useCallback(async (seasonId) => {
    if (!seasonId) {
      setRacesForCreateSeason([]);
      return;
    }
    const racesRes = await API.get(`/races/season/${seasonId}`);
    setRacesForCreateSeason(asArray(racesRes.data));
  }, []);

  const loadRounds = useCallback(async () => {
    const params = {};
    if (filters.seasonId) params.seasonId = filters.seasonId;
    if (filters.raceId) params.raceId = filters.raceId;
    if (filters.status) params.status = filters.status;

    const roundsRes = await API.get("/predictions/admin/rounds", { params });
    const nextRounds = asArray(roundsRes.data);
    setRounds(nextRounds);

    if (nextRounds.length === 0) {
      setSelectedRoundId("");
      setRoundDetails(null);
      return;
    }

    setSelectedRoundId((prev) => {
      const stillAvailable = nextRounds.some(
        (round) => String(round._id) === String(prev),
      );
      if (!prev || !stillAvailable) return String(nextRounds[0]._id);
      return prev;
    });
  }, [filters.raceId, filters.seasonId, filters.status]);

  const loadRoundDetails = useCallback(async () => {
    if (!selectedRoundId) {
      setRoundDetails(null);
      return;
    }
    const detailsRes = await API.get(
      `/predictions/admin/rounds/${selectedRoundId}`,
    );
    const details = detailsRes.data || null;
    setRoundDetails(details);

    const firstScore = asArray(details?.scores)[0] || null;
    if (firstScore) {
      setInspectorUserId((prev) => prev || getId(firstScore.userId));
      setOverrideForm((prev) => ({
        ...prev,
        userId: prev.userId || getId(firstScore.userId),
        total:
          prev.total !== ""
            ? prev.total
            : firstScore.total === null || firstScore.total === undefined
              ? ""
              : String(firstScore.total),
      }));
    } else {
      setInspectorUserId("");
      setOverrideForm({
        userId: "",
        total: "",
        reason: "",
      });
    }
  }, [selectedRoundId]);

  const refreshRoundsAndDetails = useCallback(async () => {
    await loadRounds();
    await loadRoundDetails();
  }, [loadRoundDetails, loadRounds]);

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      setError("");
      try {
        await loadSeasons();
      } catch (loadError) {
        console.error("Fehler beim Laden der Seasons:", loadError);
        setError(
          getApiErrorMessage(
            loadError,
            "Seasons konnten nicht geladen werden.",
          ),
        );
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [loadSeasons]);

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      setError("");
      try {
        await loadRounds();
      } catch (loadError) {
        console.error("Fehler beim Laden der Runden:", loadError);
        setError(
          getApiErrorMessage(loadError, "Runden konnten nicht geladen werden."),
        );
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [loadRounds]);

  useEffect(() => {
    const run = async () => {
      try {
        await loadRoundDetails();
      } catch (loadError) {
        console.error("Fehler beim Laden der Round-Details:", loadError);
        toast.error(
          getApiErrorMessage(
            loadError,
            "Round-Details konnten nicht geladen werden.",
          ),
        );
      }
    };
    run();
  }, [loadRoundDetails, selectedRoundId, toast]);

  useEffect(() => {
    const run = async () => {
      try {
        await loadRacesForCreateSeason(createForm.seasonId);
      } catch (loadError) {
        console.error("Fehler beim Laden der Rennen:", loadError);
        toast.error(
          getApiErrorMessage(loadError, "Rennen konnten nicht geladen werden."),
        );
      }
    };
    run();
  }, [createForm.seasonId, loadRacesForCreateSeason, toast]);

  const handleCreateRound = async () => {
    if (!createForm.seasonId || !createForm.raceId) {
      toast.error("Bitte Season und Rennen wählen.");
      return;
    }

    setIsBusy(true);
    try {
      const response = await API.post("/predictions/admin/rounds", {
        seasonId: createForm.seasonId,
        raceId: createForm.raceId,
      });
      toast.success("Prediction-Run erstellt.");
      if (response?.data?._id) {
        setSelectedRoundId(String(response.data._id));
      }
      await refreshRoundsAndDetails();
    } catch (createError) {
      console.error("Fehler beim Erstellen der Round:", createError);
      toast.error(
        getApiErrorMessage(
          createError,
          "Prediction-Run konnte nicht erstellt werden.",
        ),
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleTransition = async () => {
    if (!selectedRoundId || !statusForm.toStatus) {
      toast.error("Bitte Zielstatus wählen.");
      return;
    }

    setIsBusy(true);
    try {
      await API.patch(`/predictions/admin/rounds/${selectedRoundId}/status`, {
        toStatus: statusForm.toStatus,
        reason: statusForm.reason || null,
      });
      toast.success("Status aktualisiert.");
      setStatusForm((prev) => ({ ...prev, reason: "" }));
      await refreshRoundsAndDetails();
    } catch (transitionError) {
      console.error("Fehler beim Statuswechsel:", transitionError);
      toast.error(
        getApiErrorMessage(transitionError, "Statuswechsel fehlgeschlagen."),
      );
    } finally {
      setIsBusy(false);
    }
  };

  const runRoundAction = async ({ path, successMessage, errorMessage }) => {
    if (!selectedRoundId) return;
    setIsBusy(true);
    try {
      await API.post(path);
      toast.success(successMessage);
      await refreshRoundsAndDetails();
    } catch (actionError) {
      console.error(errorMessage, actionError);
      toast.error(getApiErrorMessage(actionError, errorMessage));
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteRound = async () => {
    if (!selectedRoundId || !selectedRound) return;

    const raceName = getDisplayName(selectedRound.race);
    const confirmed = window.confirm(
      `Prediction-Run für "${raceName}" wirklich löschen?\n\nAlle Tipps und Scores dieser Runde werden entfernt.`,
    );
    if (!confirmed) return;

    setIsBusy(true);
    try {
      await API.delete(`/predictions/admin/rounds/${selectedRoundId}`);
      toast.success("Prediction-Run gelöscht.");
      setRoundDetails(null);
      setSelectedRoundId("");
      await loadRounds();
    } catch (deleteError) {
      console.error("Fehler beim Löschen der Round:", deleteError);
      toast.error(
        getApiErrorMessage(
          deleteError,
          "Prediction-Run konnte nicht gelöscht werden.",
        ),
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleOverride = async () => {
    if (!selectedRoundId) return;
    if (!overrideForm.userId) {
      toast.error("Bitte Benutzer wählen.");
      return;
    }
    if (overrideForm.total === "" || Number.isNaN(Number(overrideForm.total))) {
      toast.error("Bitte gültigen Total-Score eingeben.");
      return;
    }
    if (!overrideForm.reason.trim()) {
      toast.error("Override benötigt eine Begründung.");
      return;
    }

    setIsBusy(true);
    try {
      await API.patch(
        `/predictions/admin/rounds/${selectedRoundId}/scores/${overrideForm.userId}/override`,
        {
          total: Number(overrideForm.total),
          reason: overrideForm.reason.trim(),
        },
      );
      toast.success("Override gespeichert.");
      setOverrideForm((prev) => ({ ...prev, reason: "" }));
      await refreshRoundsAndDetails();
    } catch (overrideError) {
      console.error("Fehler beim Override:", overrideError);
      toast.error(
        getApiErrorMessage(overrideError, "Override fehlgeschlagen."),
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleClearOverride = async ({ userId, userLabel }) => {
    if (!selectedRoundId || !userId) return;

    setIsBusy(true);
    try {
      await API.delete(
        `/predictions/admin/rounds/${selectedRoundId}/scores/${userId}/override`,
      );
      toast.success(
        `Override f${userLabel ? `ür ${userLabel}` : ""} entfernt und neu berechnet.`,
      );
      await refreshRoundsAndDetails();
    } catch (clearError) {
      console.error("Fehler beim Entfernen des Overrides:", clearError);
      toast.error(
        getApiErrorMessage(
          clearError,
          "Override konnte nicht entfernt werden.",
        ),
      );
    } finally {
      setIsBusy(false);
    }
  };

  const selectedScoreBreakdown = asArray(selectedScore?.breakdown);

  return (
    <div className="admin-predictions-page">
      <header className="admin-predictions-header">
        <h1>Tippspiele verwalten</h1>
        <p>
          Runden steuern, Scoring ausführen und Punkte transparent
          kontrollieren.
        </p>
      </header>

      <section className="admin-predictions-panel">
        <h2>Punkteverteilungs-Regeln</h2>
        <ul className="admin-predictions-rules-compact">
          {scoringRuleItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <div className="admin-predictions-top-grid">
        <section className="admin-predictions-panel">
          <h2>Neue Runde</h2>
          <div className="admin-predictions-create-grid">
            <label className="admin-predictions-field">
              <span>Season</span>
              <select
                value={createForm.seasonId}
                onChange={(event) =>
                  setCreateForm({ seasonId: event.target.value, raceId: "" })
                }
              >
                <option value="">Bitte wählen</option>
                {seasons.map((season) => (
                  <option key={season._id} value={season._id}>
                    {season.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-predictions-field">
              <span>Rennen</span>
              <select
                value={createForm.raceId}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    raceId: event.target.value,
                  }))
                }
                disabled={!createForm.seasonId}
              >
                <option value="">Bitte wählen</option>
                {racesForCreateSeason.map((race) => (
                  <option key={race._id} value={race._id}>
                    {race.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="admin-predictions-button primary"
              onClick={handleCreateRound}
              disabled={isBusy}
            >
              Runde erstellen
            </button>
          </div>
        </section>

        <section className="admin-predictions-panel">
          <h2>Filter</h2>
          <div className="admin-predictions-filter-grid">
            <label className="admin-predictions-field">
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
                {seasons.map((season) => (
                  <option key={season._id} value={season._id}>
                    {season.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-predictions-field">
              <span>Rennen</span>
              <select
                value={filters.raceId}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    raceId: event.target.value,
                  }))
                }
              >
                <option value="">Alle</option>
                {availableRaceFilters.map((race) => (
                  <option key={race._id} value={race._id}>
                    {race.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-predictions-field">
              <span>Status</span>
              <select
                value={filters.status}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    status: event.target.value,
                  }))
                }
              >
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      </div>

      {error ? (
        <section className="admin-predictions-panel admin-predictions-panel-error">
          <p>{error}</p>
        </section>
      ) : null}

      <div className="admin-predictions-grid">
        <section className="admin-predictions-panel">
          <div className="admin-predictions-panel-head">
            <h2>Runden</h2>
            {selectedRound ? (
              <button
                type="button"
                className="admin-predictions-button soft-danger"
                onClick={handleDeleteRound}
                disabled={isBusy}
              >
                Runde löschen
              </button>
            ) : null}
          </div>
          {isLoading ? (
            <p className="admin-predictions-inline-state">Lade Runden...</p>
          ) : rounds.length === 0 ? (
            <p className="admin-predictions-inline-state">
              Keine Runden vorhanden.
            </p>
          ) : (
            <div className="admin-predictions-round-list">
              {rounds.map((round) => {
                const roundId = String(round._id);
                const isActive = roundId === String(selectedRoundId);
                return (
                  <button
                    key={roundId}
                    type="button"
                    className={`admin-predictions-round-item ${
                      isActive ? "is-active" : ""
                    }`}
                    onClick={() => setSelectedRoundId(roundId)}
                  >
                    <div className="admin-predictions-round-top">
                      <strong>{getDisplayName(round.race)}</strong>
                      <span
                        className={`admin-predictions-status-badge ${getStatusBadgeClass(
                          round.status,
                        )}`}
                      >
                        {round.status}
                      </span>
                    </div>
                    <span>{getDisplayName(round.season)}</span>
                    <span>
                      Entries: {round?.metrics?.entries ?? 0} | Scores:{" "}
                      {round?.metrics?.scores ?? 0}
                    </span>
                    {round.requiresReview ? (
                      <span className="admin-predictions-review-flag">
                        Review erforderlich
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="admin-predictions-panel">
          <h2>Runden-Steuerung</h2>
          {!selectedRound ? (
            <p className="admin-predictions-inline-state">
              Wähle eine Runde aus.
            </p>
          ) : (
            <>
              <div className="admin-predictions-meta-grid">
                <p>
                  <strong>Season:</strong>{" "}
                  {getDisplayName(selectedRound.season)}
                </p>
                <p>
                  <strong>Rennen:</strong> {getDisplayName(selectedRound.race)}
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  <span
                    className={`admin-predictions-status-badge ${getStatusBadgeClass(
                      selectedRound.status,
                    )}`}
                  >
                    {selectedRound.status}
                  </span>
                </p>
                <p>
                  <strong>Requires Review:</strong>{" "}
                  {selectedRound.requiresReview ? "Ja" : "Nein"}
                </p>
              </div>

              <div className="admin-predictions-action-row">
                <button
                  type="button"
                  className="admin-predictions-button"
                  onClick={() =>
                    runRoundAction({
                      path: `/predictions/admin/rounds/${selectedRoundId}/score`,
                      successMessage: "Scoring ausgeführt.",
                      errorMessage: "Scoring fehlgeschlagen.",
                    })
                  }
                  disabled={isBusy}
                >
                  Score
                </button>
                <button
                  type="button"
                  className="admin-predictions-button"
                  onClick={() =>
                    runRoundAction({
                      path: `/predictions/admin/rounds/${selectedRoundId}/publish`,
                      successMessage: "Round veröffentlicht.",
                      errorMessage: "Publish fehlgeschlagen.",
                    })
                  }
                  disabled={isBusy}
                >
                  Publish
                </button>
                <button
                  type="button"
                  className="admin-predictions-button"
                  onClick={() =>
                    runRoundAction({
                      path: `/predictions/admin/rounds/${selectedRoundId}/rescore-from-race`,
                      successMessage: "Rescore ausgeführt.",
                      errorMessage: "Rescore fehlgeschlagen.",
                    })
                  }
                  disabled={isBusy}
                >
                  Rescore from Race
                </button>
              </div>

              <div className="admin-predictions-inline-forms">
                <div className="admin-predictions-card">
                  <h3>Statuswechsel</h3>
                  <label className="admin-predictions-field">
                    <span>Zielstatus</span>
                    <select
                      value={statusForm.toStatus}
                      onChange={(event) =>
                        setStatusForm((prev) => ({
                          ...prev,
                          toStatus: event.target.value,
                        }))
                      }
                    >
                      <option value="">Bitte wählen</option>
                      {TRANSITION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="admin-predictions-field">
                    <span>Grund (bei Reopen empfohlen)</span>
                    <input
                      type="text"
                      value={statusForm.reason}
                      onChange={(event) =>
                        setStatusForm((prev) => ({
                          ...prev,
                          reason: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="admin-predictions-button primary"
                    onClick={handleTransition}
                    disabled={isBusy}
                  >
                    Status setzen
                  </button>
                </div>

                <div className="admin-predictions-card">
                  <h3>Punktestand Override</h3>
                  <label className="admin-predictions-field">
                    <span>User</span>
                    <select
                      value={overrideForm.userId}
                      onChange={(event) =>
                        setOverrideForm((prev) => ({
                          ...prev,
                          userId: event.target.value,
                        }))
                      }
                    >
                      <option value="">Bitte wählen</option>
                      {scoreRows.map((score) => (
                        <option key={score._id} value={getId(score.userId)}>
                          {getDisplayName(score.userId)} (aktuell{" "}
                          {formatPoints(score.total)})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="admin-predictions-field">
                    <span>Neuer Total-Punktestand</span>
                    <input
                      type="number"
                      value={overrideForm.total}
                      onChange={(event) =>
                        setOverrideForm((prev) => ({
                          ...prev,
                          total: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="admin-predictions-field">
                    <span>Grund (Pflicht)</span>
                    <input
                      type="text"
                      value={overrideForm.reason}
                      onChange={(event) =>
                        setOverrideForm((prev) => ({
                          ...prev,
                          reason: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="admin-predictions-button primary"
                    onClick={handleOverride}
                    disabled={isBusy}
                  >
                    Override speichern
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <section className="admin-predictions-panel">
        <h2>Manuelle Overrides</h2>
        <p className="admin-predictions-inline-state">
          Aktive manuelle Overrides in dieser Runde: {overriddenScores.length}
        </p>

        {overriddenScores.length === 0 ? (
          <p className="admin-predictions-inline-state">
            Keine aktiven manuellen Overrides vorhanden.
          </p>
        ) : (
          <div className="admin-predictions-table-wrap">
            <table className="admin-predictions-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Total</th>
                  <th>Grund</th>
                  <th>Von</th>
                  <th>Zeit</th>
                  <th>Aktion</th>
                </tr>
              </thead>
              <tbody>
                {overriddenScores.map((score) => {
                  const userId = getId(score.userId);
                  const userLabel = getDisplayName(score.userId);
                  return (
                    <tr key={`override-${score._id}`}>
                      <td>{userLabel}</td>
                      <td>{formatPoints(score.total)}</td>
                      <td>{score.overrideReason || "-"}</td>
                      <td>{getDisplayName(score.overrideBy)}</td>
                      <td>{formatDateTime(score.overrideAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-predictions-button"
                          onClick={() =>
                            handleClearOverride({
                              userId,
                              userLabel,
                            })
                          }
                          disabled={isBusy}
                        >
                          Override löschen + neu berechnen
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-predictions-panel">
        <h2>Punktestand-Inspektor</h2>
        {scoreRows.length === 0 ? (
          <p className="admin-predictions-inline-state">
            Keine Scores vorhanden.
          </p>
        ) : (
          <>
            <label className="admin-predictions-field admin-predictions-inspector-select">
              <span>Punktestand für User anzeigen</span>
              <select
                value={getId(selectedScore?.userId)}
                onChange={(event) => setInspectorUserId(event.target.value)}
              >
                {scoreRows.map((score) => (
                  <option key={score._id} value={getId(score.userId)}>
                    {getDisplayName(score.userId)} ({formatPoints(score.total)})
                  </option>
                ))}
              </select>
            </label>

            <div className="admin-predictions-score-summary">
              <article>
                <p>Total</p>
                <strong>{formatPoints(selectedScore?.total)}</strong>
              </article>
              <article>
                <p>Override</p>
                <strong>{selectedScore?.isOverridden ? "Ja" : "Nein"}</strong>
              </article>
              <article>
                <p>Generated</p>
                <strong>
                  {formatDateTime(selectedScore?.generatedFrom?.generatedAt)}
                </strong>
              </article>
              <article>
                <p>Trigger</p>
                <strong>{selectedScore?.generatedFrom?.trigger || "-"}</strong>
              </article>
            </div>

            {selectedScore?.isOverridden ? (
              <div className="admin-predictions-card admin-predictions-override-meta">
                <h3>Aktiver Override</h3>
                <p>
                  <strong>Grund:</strong> {selectedScore?.overrideReason || "-"}
                </p>
                <p>
                  <strong>Von:</strong>{" "}
                  {getDisplayName(selectedScore?.overrideBy)}
                </p>
                <p>
                  <strong>Zeit:</strong>{" "}
                  {formatDateTime(selectedScore?.overrideAt)}
                </p>
                <button
                  type="button"
                  className="admin-predictions-button"
                  onClick={() =>
                    handleClearOverride({
                      userId: getId(selectedScore?.userId),
                      userLabel: getDisplayName(selectedScore?.userId),
                    })
                  }
                  disabled={isBusy}
                >
                  Override löschen + neu berechnen
                </button>
              </div>
            ) : null}

            <div className="admin-predictions-snapshot-grid">
              <div className="admin-predictions-card">
                <h3>Getippt</h3>
                <p>P1: {getDisplayName(selectedScore?.predicted?.p1)}</p>
                <p>P2: {getDisplayName(selectedScore?.predicted?.p2)}</p>
                <p>P3: {getDisplayName(selectedScore?.predicted?.p3)}</p>
                <p>
                  Last: {getDisplayName(selectedScore?.predicted?.lastPlace)}
                </p>
              </div>

              <div className="admin-predictions-card">
                <h3>Tatsächlich</h3>
                <p>P1: {getDisplayName(selectedScore?.actual?.p1)}</p>
                <p>P2: {getDisplayName(selectedScore?.actual?.p2)}</p>
                <p>P3: {getDisplayName(selectedScore?.actual?.p3)}</p>
                <p>Last: {getDisplayName(selectedScore?.actual?.lastPlace)}</p>
              </div>
            </div>

            <div className="admin-predictions-table-wrap">
              <table className="admin-predictions-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Label</th>
                    <th>Punkte</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedScoreBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={4}>Keine Breakdown-Einträge vorhanden.</td>
                    </tr>
                  ) : (
                    selectedScoreBreakdown.map((row, index) => (
                      <tr key={`${row.code || "row"}-${index}`}>
                        <td>{row.code || "-"}</td>
                        <td>{row.label || "-"}</td>
                        <td>{formatPoints(row.points)}</td>
                        <td>{row.details || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="admin-predictions-panel">
        <h2>Entries</h2>
        <div className="admin-predictions-table-wrap">
          <table className="admin-predictions-table">
            <thead>
              <tr>
                <th>User</th>
                <th>P1</th>
                <th>P2</th>
                <th>P3</th>
                <th>Last</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {entryRows.length === 0 ? (
                <tr>
                  <td colSpan={6}>Keine Entries vorhanden.</td>
                </tr>
              ) : (
                entryRows.map((entry) => (
                  <tr key={entry._id}>
                    <td>{getDisplayName(entry.userId)}</td>
                    <td>{getDisplayName(entry?.picks?.p1)}</td>
                    <td>{getDisplayName(entry?.picks?.p2)}</td>
                    <td>{getDisplayName(entry?.picks?.p3)}</td>
                    <td>{getDisplayName(entry?.picks?.lastPlace)}</td>
                    <td>{formatDateTime(entry.submittedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-predictions-panel">
        <h2>Punkteverteilung</h2>
        <div className="admin-predictions-table-wrap">
          <table className="admin-predictions-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Total</th>
                <th>Override</th>
                <th>Generated</th>
                <th>Trigger</th>
              </tr>
            </thead>
            <tbody>
              {scoreRows.length === 0 ? (
                <tr>
                  <td colSpan={5}>Keine Scores vorhanden.</td>
                </tr>
              ) : (
                scoreRows.map((score) => (
                  <tr key={score._id}>
                    <td>{getDisplayName(score.userId)}</td>
                    <td>{formatPoints(score.total)}</td>
                    <td>{score.isOverridden ? "Ja" : "Nein"}</td>
                    <td>{formatDateTime(score?.generatedFrom?.generatedAt)}</td>
                    <td>{score?.generatedFrom?.trigger || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
