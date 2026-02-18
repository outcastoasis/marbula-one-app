import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import API from "../api";
import { AuthContext } from "../context/AuthContext";
import "../styles/Stats.css";

const MAX_COMPARE_USERS = 5;

const emptyOverall = {
  completedSeasonsCount: 0,
  participatedSeasonsCount: 0,
  raceCount: 0,
  totalPoints: 0,
  podiumCount: 0,
  top3Rate: 0,
  seasonsWon: 0,
  bestRace: null,
  worstRace: null,
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const getDisplayName = (user) => {
  const realname =
    typeof user?.realname === "string" ? user.realname.trim() : "";
  if (realname) return realname;
  const username =
    typeof user?.username === "string" ? user.username.trim() : "";
  return username || "Unbekannt";
};

const formatPercent = (value) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }

  return `${(value * 100).toFixed(1)}%`;
};

const formatRaceLabel = (race, includeSeason = false) => {
  if (!race) return "-";

  const seasonPrefix =
    includeSeason && race.seasonName ? `${race.seasonName} - ` : "";
  const points =
    typeof race.points === "number" && Number.isFinite(race.points)
      ? race.points
      : "-";
  return `${seasonPrefix}${race.raceName || "-"} (${points})`;
};

export default function Stats() {
  const { user } = useContext(AuthContext);
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [completedSeasons, setCompletedSeasons] = useState([]);
  const [compareCandidates, setCompareCandidates] = useState([]);
  const [selectedCompareIds, setSelectedCompareIds] = useState([]);
  const [statsResponse, setStatsResponse] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(true);
  const [error, setError] = useState("");

  const loadFilterData = useCallback(async () => {
    if (!user?._id) {
      return;
    }

    setIsLoadingCandidates(true);
    try {
      const seasonsRes = await API.get("/seasons");
      const allSeasons = asArray(seasonsRes.data);
      const completed = allSeasons
        .filter((season) => season?.isCompleted === true)
        .sort(
          (a, b) =>
            new Date(b?.eventDate || 0).getTime() -
            new Date(a?.eventDate || 0).getTime(),
        );
      setCompletedSeasons(completed);

      if (completed.length === 0) {
        setCompareCandidates([]);
        setSelectedCompareIds([]);
        return;
      }

      const assignmentResponses = await Promise.all(
        completed.map((season) =>
          API.get(`/userSeasonTeams?season=${season._id}`).catch(() => ({
            data: [],
          })),
        ),
      );

      const candidateMap = new Map();
      assignmentResponses.forEach((response) => {
        asArray(response?.data).forEach((assignment) => {
          const assignmentUser = assignment?.user;
          const candidateId =
            typeof assignmentUser === "object"
              ? assignmentUser?._id
              : assignmentUser;
          if (!candidateId || candidateId === user._id) {
            return;
          }

          candidateMap.set(candidateId, {
            _id: candidateId,
            realname:
              typeof assignmentUser?.realname === "string"
                ? assignmentUser.realname
                : "",
            username:
              typeof assignmentUser?.username === "string"
                ? assignmentUser.username
                : "",
          });
        });
      });

      const candidates = [...candidateMap.values()].sort((a, b) =>
        getDisplayName(a).localeCompare(getDisplayName(b), "de-CH"),
      );
      setCompareCandidates(candidates);
      setSelectedCompareIds((previous) =>
        previous.filter((id) => candidateMap.has(id)),
      );
    } catch (loadError) {
      console.error("Fehler beim Laden der Stats-Filterdaten:", loadError);
      setCompareCandidates([]);
      setSelectedCompareIds([]);
    } finally {
      setIsLoadingCandidates(false);
    }
  }, [user?._id]);

  useEffect(() => {
    loadFilterData();
  }, [loadFilterData]);

  useEffect(() => {
    if (
      seasonFilter !== "all" &&
      !completedSeasons.some((season) => season?._id === seasonFilter)
    ) {
      setSeasonFilter("all");
    }
  }, [seasonFilter, completedSeasons]);

  const loadStats = useCallback(async () => {
    if (!user?._id) {
      return;
    }

    setIsLoadingStats(true);
    setError("");
    try {
      const params = {
        completedOnly: true,
        seasonId: seasonFilter,
      };
      if (selectedCompareIds.length > 0) {
        params.compare = selectedCompareIds.join(",");
      }

      const response = await API.get("/stats/me", { params });
      setStatsResponse(response.data || null);
    } catch (loadError) {
      console.error("Fehler beim Laden der Stats:", loadError);
      setStatsResponse(null);
      setError(
        loadError?.response?.data?.message || "Stats konnten nicht geladen werden.",
      );
    } finally {
      setIsLoadingStats(false);
    }
  }, [seasonFilter, selectedCompareIds, user?._id]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const baseUserEntry = statsResponse?.baseUser || null;
  const baseStats = baseUserEntry?.stats || null;
  const seasonStats = asArray(baseStats?.seasons);
  const overall = baseStats?.overall || emptyOverall;
  const comparisons = asArray(statsResponse?.comparisons);

  const detailSeason = useMemo(() => {
    if (seasonStats.length === 0) {
      return null;
    }

    return (
      seasonStats.find((season) => season?.participationStatus === "participated") ||
      seasonStats[0]
    );
  }, [seasonStats]);

  const toggleCompare = (compareId) => {
    setSelectedCompareIds((previous) => {
      if (previous.includes(compareId)) {
        return previous.filter((id) => id !== compareId);
      }
      if (previous.length >= MAX_COMPARE_USERS) {
        return previous;
      }
      return [...previous, compareId];
    });
  };

  return (
    <div className="stats-page">
      <header className="stats-header">
        <h1>Persönliche Stats</h1>
        <p>
          Übersicht für <strong>{getDisplayName(baseUserEntry || user)}</strong>
        </p>
      </header>

      <section className="stats-panel">
        <div className="stats-filter-grid">
          <label className="stats-field">
            <span>Season</span>
            <select
              value={seasonFilter}
              onChange={(event) => setSeasonFilter(event.target.value)}
            >
              <option value="all">Alle abgeschlossenen</option>
              {completedSeasons.map((season) => (
                <option key={season._id} value={season._id}>
                  {season.name}
                </option>
              ))}
            </select>
          </label>

          <div className="stats-field">
            <span>Vergleich (optional, max. {MAX_COMPARE_USERS})</span>
            {isLoadingCandidates ? (
              <p className="stats-inline-state">Vergleichs-User werden geladen…</p>
            ) : compareCandidates.length === 0 ? (
              <p className="stats-inline-state">
                Keine Vergleichs-User in abgeschlossenen Seasons gefunden.
              </p>
            ) : (
              <div className="stats-compare-list">
                {compareCandidates.map((candidate) => (
                  <label key={candidate._id} className="stats-compare-item">
                    <input
                      type="checkbox"
                      checked={selectedCompareIds.includes(candidate._id)}
                      onChange={() => toggleCompare(candidate._id)}
                    />
                    <span>{getDisplayName(candidate)}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {error ? (
        <section className="stats-panel stats-panel-error">
          <p>{error}</p>
        </section>
      ) : null}

      <section className="stats-panel">
        <h2>Key Stats</h2>
        <div className="stats-kpi-grid">
          <article className="stats-kpi">
            <p>Gesamtpunkte</p>
            <strong>{overall.totalPoints ?? 0}</strong>
          </article>
          <article className="stats-kpi">
            <p>Podien</p>
            <strong>{overall.podiumCount ?? 0}</strong>
          </article>
          <article className="stats-kpi">
            <p>Top-3-Rate</p>
            <strong>{formatPercent(overall.top3Rate)}</strong>
          </article>
          <article className="stats-kpi">
            <p>Seasons gewonnen</p>
            <strong>{overall.seasonsWon ?? 0}</strong>
          </article>
          <article className="stats-kpi stats-kpi-wide">
            <p>Best Race</p>
            <strong>{formatRaceLabel(overall.bestRace, true)}</strong>
          </article>
          <article className="stats-kpi stats-kpi-wide">
            <p>Worst Race</p>
            <strong>{formatRaceLabel(overall.worstRace, true)}</strong>
          </article>
        </div>
        <p className="stats-footnote">
          Abgeschlossene Seasons: {overall.completedSeasonsCount ?? 0} |
          Teilgenommen: {overall.participatedSeasonsCount ?? 0}
        </p>
      </section>

      <section className="stats-panel">
        <h2>Season Übersicht</h2>
        {isLoadingStats ? (
          <p className="stats-inline-state">Stats werden geladen…</p>
        ) : seasonStats.length === 0 ? (
          <p className="stats-inline-state">
            Keine abgeschlossenen Seasons für Stats verfügbar.
          </p>
        ) : (
          <div className="stats-table-wrap">
            <table className="stats-table">
              <thead>
                <tr>
                  <th>Season</th>
                  <th>Status</th>
                  <th>Rennen</th>
                  <th>Punkte</th>
                  <th>Podien</th>
                  <th>Top-3-Rate</th>
                  <th>Endrang</th>
                  <th>Best Race</th>
                  <th>Worst Race</th>
                </tr>
              </thead>
              <tbody>
                {seasonStats.map((season) => {
                  if (season.participationStatus !== "participated") {
                    return (
                      <tr key={season.seasonId} className="stats-row-muted">
                        <td>{season.seasonName}</td>
                        <td>
                          <span className="stats-badge stats-badge-muted">
                            Nicht teilgenommen
                          </span>
                        </td>
                        <td colSpan={7}>Nicht teilgenommen</td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={season.seasonId}>
                      <td>{season.seasonName}</td>
                      <td>
                        <span className="stats-badge">Teilgenommen</span>
                      </td>
                      <td>{season.raceCount}</td>
                      <td>{season.totalPoints}</td>
                      <td>{season.podiumCount}</td>
                      <td>{formatPercent(season.top3Rate)}</td>
                      <td>{season.finalRank ?? "-"}</td>
                      <td>{formatRaceLabel(season.bestRace)}</td>
                      <td>{formatRaceLabel(season.worstRace)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="stats-panel">
        <h2>Race Detail</h2>
        {!detailSeason ? (
          <p className="stats-inline-state">Keine Race-Details verfügbar.</p>
        ) : detailSeason.participationStatus !== "participated" ? (
          <p className="stats-inline-state">
            In <strong>{detailSeason.seasonName}</strong>: Nicht teilgenommen.
          </p>
        ) : (
          <>
            <p className="stats-subline">
              Season: <strong>{detailSeason.seasonName}</strong>
            </p>
            <div className="stats-table-wrap">
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>Rennen</th>
                    <th>Punkte</th>
                    <th>Kumuliert</th>
                    <th>Rang im Rennen</th>
                    <th>Zwischenrang</th>
                    <th>Podium</th>
                  </tr>
                </thead>
                <tbody>
                  {asArray(detailSeason.races).map((race) => (
                    <tr key={race.raceId}>
                      <td>{race.raceName}</td>
                      <td>{race.points}</td>
                      <td>{race.cumulativePoints}</td>
                      <td>{race.raceRank}</td>
                      <td>{race.cumulativeRank}</td>
                      <td>{race.isPodium ? "Ja" : "Nein"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="stats-panel">
        <h2>Vergleich</h2>
        {selectedCompareIds.length === 0 ? (
          <p className="stats-inline-state">
            Wähle im Filter einen oder mehrere User für den Vergleich.
          </p>
        ) : comparisons.length === 0 ? (
          <p className="stats-inline-state">Keine Vergleichsdaten verfügbar.</p>
        ) : (
          <div className="stats-compare-grid">
            {comparisons.map((entry) => {
              const compareOverall = entry?.stats?.overall || emptyOverall;
              const noParticipation =
                (compareOverall.participatedSeasonsCount ?? 0) === 0;

              return (
                <article key={entry._id} className="stats-compare-card">
                  <h3>{getDisplayName(entry)}</h3>
                  {noParticipation ? (
                    <p className="stats-inline-state">
                      Nicht teilgenommen im aktuellen Filter.
                    </p>
                  ) : (
                    <div className="stats-compare-values">
                      <p>
                        Punkte: <strong>{compareOverall.totalPoints ?? 0}</strong>
                      </p>
                      <p>
                        Podien: <strong>{compareOverall.podiumCount ?? 0}</strong>
                      </p>
                      <p>
                        Top-3-Rate:{" "}
                        <strong>{formatPercent(compareOverall.top3Rate)}</strong>
                      </p>
                      <p>
                        Gewonnene Seasons:{" "}
                        <strong>{compareOverall.seasonsWon ?? 0}</strong>
                      </p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
