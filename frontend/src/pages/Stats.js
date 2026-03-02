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
  predictionRoundCount: 0,
  predictionPoints: 0,
  predictionPodiumCount: 0,
  predictionTop3Rate: 0,
  avgPredictionPointsPerRound: 0,
  podiumCount: 0,
  top3Rate: 0,
  avgPointsPerRace: 0,
  combinedPoints: 0,
  avgCombinedPointsPerRace: 0,
  avgSeasonEndRank: null,
  avgCombinedSeasonEndRank: null,
  seasonsWon: 0,
  bestRace: null,
  worstRace: null,
  bestPredictionRound: null,
  worstPredictionRound: null,
};

const emptyOverview = {
  completedSeasonsCount: 0,
  avgPlayersPerSeason: 0,
  mostPointsPlayer: null,
  leastPointsPlayer: null,
};

const asArray = (value) => (Array.isArray(value) ? value : []);
const toSafeNumber = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

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

const formatNumber = (value, digits = 2) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return value.toFixed(digits);
};

const clampPercent = (value) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, value));
};

const formatRaceLabel = (race, includeSeason = false) => {
  if (!race) return "-";

  const seasonPrefix =
    includeSeason && race.seasonName ? `${race.seasonName} - ` : "";
  const points = toSafeNumber(race.points);
  return `${seasonPrefix}${race.raceName || "-"} (${points})`;
};

const normalizeBars = (entries, options = {}) => {
  const { lowerIsBetter = false } = options;

  const hasNumericValue = (value) =>
    typeof value === "number" && Number.isFinite(value);

  const numericValues = entries
    .map((entry) => entry.value)
    .filter((value) => hasNumericValue(value));

  if (numericValues.length === 0) {
    return entries.map((entry) => ({
      ...entry,
      percent: 0,
    }));
  }

  if (!lowerIsBetter) {
    const maxValue = Math.max(...numericValues, 0);
    return entries.map((entry) => {
      if (!hasNumericValue(entry.value)) {
        return { ...entry, percent: 0 };
      }
      return {
        ...entry,
        percent: maxValue > 0 ? (entry.value / maxValue) * 100 : 0,
      };
    });
  }

  const minValue = Math.min(...numericValues);
  const maxValue = Math.max(...numericValues);
  const valueRange = maxValue - minValue;

  return entries.map((entry) => {
    if (!hasNumericValue(entry.value)) {
      return { ...entry, percent: 0 };
    }
    if (valueRange === 0) {
      return { ...entry, percent: 100 };
    }
    return {
      ...entry,
      percent: ((maxValue - entry.value) / valueRange) * 100,
    };
  });
};

export default function Stats() {
  const { user } = useContext(AuthContext);
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [includePredictions, setIncludePredictions] = useState(true);
  const [completedSeasons, setCompletedSeasons] = useState([]);
  const [compareCandidatesAll, setCompareCandidatesAll] = useState([]);
  const [compareCandidatesBySeason, setCompareCandidatesBySeason] = useState(
    {},
  );
  const [selectedCompareIds, setSelectedCompareIds] = useState([]);
  const [statsResponse, setStatsResponse] = useState(null);
  const [globalOverview, setGlobalOverview] = useState(emptyOverview);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(true);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
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
        setCompareCandidatesAll([]);
        setCompareCandidatesBySeason({});
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

      const allCandidateMap = new Map();
      const bySeason = {};

      assignmentResponses.forEach((response, index) => {
        const seasonId = completed[index]?._id;
        const seasonCandidateMap = new Map();

        asArray(response?.data).forEach((assignment) => {
          const assignmentUser = assignment?.user;
          const candidateId =
            typeof assignmentUser === "object"
              ? assignmentUser?._id
              : assignmentUser;
          if (!candidateId || candidateId === user._id) {
            return;
          }

          const candidate = {
            _id: candidateId,
            realname:
              typeof assignmentUser?.realname === "string"
                ? assignmentUser.realname
                : "",
            username:
              typeof assignmentUser?.username === "string"
                ? assignmentUser.username
                : "",
          };

          allCandidateMap.set(candidateId, candidate);
          seasonCandidateMap.set(candidateId, candidate);
        });

        if (seasonId) {
          bySeason[seasonId] = [...seasonCandidateMap.values()].sort((a, b) =>
            getDisplayName(a).localeCompare(getDisplayName(b), "de-CH"),
          );
        }
      });

      const allCandidates = [...allCandidateMap.values()].sort((a, b) =>
        getDisplayName(a).localeCompare(getDisplayName(b), "de-CH"),
      );
      setCompareCandidatesAll(allCandidates);
      setCompareCandidatesBySeason(bySeason);
    } catch (loadError) {
      console.error(
        "Fehler beim Laden der Statistiken-Filterdaten:",
        loadError,
      );
      setCompareCandidatesAll([]);
      setCompareCandidatesBySeason({});
      setSelectedCompareIds([]);
    } finally {
      setIsLoadingCandidates(false);
    }
  }, [user?._id]);

  useEffect(() => {
    loadFilterData();
  }, [loadFilterData]);

  const loadGlobalOverview = useCallback(async () => {
    if (!user?._id) {
      return;
    }

    setIsLoadingOverview(true);
    try {
      const response = await API.get("/stats/overview", {
        params: { completedOnly: true },
      });
      setGlobalOverview(response?.data?.overview || emptyOverview);
    } catch (loadError) {
      console.error(
        "Fehler beim Laden der allgemeinen Statistiken:",
        loadError,
      );
      setGlobalOverview(emptyOverview);
    } finally {
      setIsLoadingOverview(false);
    }
  }, [user?._id]);

  useEffect(() => {
    loadGlobalOverview();
  }, [loadGlobalOverview]);

  useEffect(() => {
    if (
      seasonFilter !== "all" &&
      !completedSeasons.some((season) => season?._id === seasonFilter)
    ) {
      setSeasonFilter("all");
    }
  }, [seasonFilter, completedSeasons]);

  const availableCompareCandidates = useMemo(() => {
    if (seasonFilter === "all") {
      return compareCandidatesAll;
    }
    return compareCandidatesBySeason[seasonFilter] || [];
  }, [seasonFilter, compareCandidatesAll, compareCandidatesBySeason]);

  useEffect(() => {
    const allowedIds = new Set(
      availableCompareCandidates.map((candidate) => candidate._id),
    );

    setSelectedCompareIds((previous) => {
      const filtered = previous.filter((id) => allowedIds.has(id));
      if (filtered.length === previous.length) {
        return previous;
      }
      return filtered;
    });
  }, [availableCompareCandidates]);

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
        loadError?.response?.data?.message ||
          "Statistiken konnten nicht geladen werden.",
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
  const showCombinedMode = includePredictions;
  const displayedTotalPoints = showCombinedMode
    ? toSafeNumber(overall.combinedPoints)
    : toSafeNumber(overall.totalPoints);
  const displayedAvgPoints = showCombinedMode
    ? toSafeNumber(overall.avgCombinedPointsPerRace)
    : toSafeNumber(overall.avgPointsPerRace);
  const displayedAvgSeasonRank = showCombinedMode
    ? overall.avgCombinedSeasonEndRank
    : overall.avgSeasonEndRank;
  const displayedRankTitle = showCombinedMode
    ? "Ø Season-Endrang (Gesamt)"
    : "Ø Season-Endrang";

  const detailSeason = useMemo(() => {
    if (seasonStats.length === 0) {
      return null;
    }

    return (
      seasonStats.find(
        (season) => season?.participationStatus === "participated",
      ) || seasonStats[0]
    );
  }, [seasonStats]);

  const ownBarsConfig = useMemo(() => {
    const pointsLabel = showCombinedMode
      ? "Gesamtpunkte inkl. Predictions"
      : "Punkte pro Rennen";

    if (seasonFilter !== "all") {
      const selectedSeason = seasonStats.find(
        (season) => season?.seasonId === seasonFilter,
      );

      if (!selectedSeason) {
        return {
          title: pointsLabel,
          entries: [],
          emptyMessage: "Keine Daten für diese Season gefunden.",
        };
      }

      if (selectedSeason.participationStatus !== "participated") {
        return {
          title: pointsLabel,
          entries: [],
          emptyMessage: "Nicht teilgenommen in dieser Season.",
        };
      }

      const entries = asArray(selectedSeason.races).map((race) => ({
        key: race.raceId || race.raceName,
        label: race.raceName,
        value: showCombinedMode
          ? toSafeNumber(race.combinedPoints)
          : toSafeNumber(race.points),
      }));

      return {
        title: `${selectedSeason.seasonName}: ${pointsLabel}`,
        entries: normalizeBars(entries),
        emptyMessage: "Keine Rennen vorhanden.",
      };
    }

    const entries = seasonStats
      .filter((season) => season?.participationStatus === "participated")
      .map((season) => ({
        key: season.seasonId,
        label: season.seasonName,
        value: showCombinedMode
          ? toSafeNumber(season.combinedPoints)
          : toSafeNumber(season.totalPoints),
      }));

    return {
      title: showCombinedMode
        ? "Gesamtpunkte pro Season (inkl. Predictions)"
        : "Gesamtpunkte pro Season",
      entries: normalizeBars(entries),
      emptyMessage: "Keine teilgenommenen Seasons vorhanden.",
    };
  }, [seasonFilter, seasonStats, showCombinedMode]);

  const ownRankLineConfig = useMemo(() => {
    if (seasonFilter !== "all") {
      return null;
    }

    const points = seasonStats
      .filter((season) => season?.participationStatus === "participated")
      .map((season) => ({
        key: season.seasonId,
        label: season.seasonName,
        value: (() => {
          const rankValue = showCombinedMode
            ? season.finalCombinedRank
            : season.finalRank;
          return typeof rankValue === "number" && Number.isFinite(rankValue)
            ? rankValue
            : null;
        })(),
      }))
      .filter((entry) => entry.value != null);

    return {
      title: showCombinedMode
        ? "Endrang pro Season (inkl. Predictions)"
        : "Endrang pro Season",
      points,
      emptyMessage: "Keine Endränge für teilgenommene Seasons vorhanden.",
    };
  }, [seasonFilter, seasonStats, showCombinedMode]);

  const predictionBarsConfig = useMemo(() => {
    if (seasonFilter !== "all") {
      const selectedSeason = seasonStats.find(
        (season) => season?.seasonId === seasonFilter,
      );

      if (!selectedSeason) {
        return {
          title: "Prediction-Punkte pro Runde",
          entries: [],
          emptyMessage: "Keine Daten fÃ¼r diese Season gefunden.",
        };
      }

      if (selectedSeason.participationStatus !== "participated") {
        return {
          title: "Prediction-Punkte pro Runde",
          entries: [],
          emptyMessage: "Nicht teilgenommen in dieser Season.",
        };
      }

      const entries = asArray(selectedSeason.races).map((race) => ({
        key: race.raceId || race.raceName,
        label: race.raceName,
        value: toSafeNumber(race.predictionPoints),
      }));

      return {
        title: `${selectedSeason.seasonName}: Prediction-Punkte pro Runde`,
        entries: normalizeBars(entries),
        emptyMessage: "Keine Prediction-Runden vorhanden.",
      };
    }

    const entries = seasonStats
      .filter((season) => season?.participationStatus === "participated")
      .map((season) => ({
        key: season.seasonId,
        label: season.seasonName,
        value: toSafeNumber(season.predictionPoints),
      }));

    return {
      title: "Prediction-Punkte pro Season",
      entries: normalizeBars(entries),
      emptyMessage: "Keine teilgenommenen Seasons vorhanden.",
    };
  }, [seasonFilter, seasonStats]);

  const compareMetricUsers = useMemo(() => {
    if (selectedCompareIds.length === 0) {
      return [];
    }

    const baseName = getDisplayName(baseUserEntry || user);

    return [
      {
        key: baseUserEntry?._id || "me",
        label: `${baseName} (Du)`,
        isBase: true,
        note: "",
        overall,
      },
      ...comparisons.map((entry) => {
        const compareOverall = entry?.stats?.overall || emptyOverall;
        const notParticipated =
          toSafeNumber(compareOverall.participatedSeasonsCount) === 0;

        return {
          key: entry._id,
          label: getDisplayName(entry),
          isBase: false,
          note: notParticipated ? "Nicht teilgenommen" : "",
          overall: compareOverall,
        };
      }),
    ];
  }, [selectedCompareIds, comparisons, baseUserEntry, user, overall]);

  const compareTotalPointsBars = useMemo(() => {
    if (compareMetricUsers.length === 0) {
      return [];
    }

    const entries = compareMetricUsers.map((entry) => ({
      key: entry.key,
      label: entry.label,
      isBase: entry.isBase,
      note: entry.note,
      value: showCombinedMode
        ? toSafeNumber(entry.overall?.combinedPoints)
        : toSafeNumber(entry.overall?.totalPoints),
    }));

    const sorted = [...entries].sort((a, b) => b.value - a.value);
    return normalizeBars(sorted);
  }, [compareMetricUsers, showCombinedMode]);

  const compareAvgPointsBars = useMemo(() => {
    if (compareMetricUsers.length === 0) {
      return [];
    }

    const entries = compareMetricUsers.map((entry) => ({
      key: entry.key,
      label: entry.label,
      isBase: entry.isBase,
      note: entry.note,
      value: showCombinedMode
        ? toSafeNumber(entry.overall?.avgCombinedPointsPerRace)
        : toSafeNumber(entry.overall?.avgPointsPerRace),
    }));

    const sorted = [...entries].sort((a, b) => b.value - a.value);
    return normalizeBars(sorted);
  }, [compareMetricUsers, showCombinedMode]);

  const comparePodiumRateBars = useMemo(() => {
    if (compareMetricUsers.length === 0) {
      return [];
    }

    const entries = compareMetricUsers.map((entry) => ({
      key: entry.key,
      label: entry.label,
      isBase: entry.isBase,
      note: entry.note,
      value: toSafeNumber(entry.overall?.top3Rate),
    }));

    const sorted = [...entries].sort((a, b) => b.value - a.value);
    return normalizeBars(sorted);
  }, [compareMetricUsers]);

  const comparePredictionPointsBars = useMemo(() => {
    if (compareMetricUsers.length === 0) {
      return [];
    }

    const entries = compareMetricUsers.map((entry) => ({
      key: entry.key,
      label: entry.label,
      isBase: entry.isBase,
      note: entry.note,
      value: toSafeNumber(entry.overall?.predictionPoints),
    }));

    const sorted = [...entries].sort((a, b) => b.value - a.value);
    return normalizeBars(sorted);
  }, [compareMetricUsers]);

  const comparePredictionAvgBars = useMemo(() => {
    if (compareMetricUsers.length === 0) {
      return [];
    }

    const entries = compareMetricUsers.map((entry) => ({
      key: entry.key,
      label: entry.label,
      isBase: entry.isBase,
      note: entry.note,
      value: toSafeNumber(entry.overall?.avgPredictionPointsPerRound),
    }));

    const sorted = [...entries].sort((a, b) => b.value - a.value);
    return normalizeBars(sorted);
  }, [compareMetricUsers]);

  const comparePredictionTop3Bars = useMemo(() => {
    if (compareMetricUsers.length === 0) {
      return [];
    }

    const entries = compareMetricUsers.map((entry) => ({
      key: entry.key,
      label: entry.label,
      isBase: entry.isBase,
      note: entry.note,
      value: toSafeNumber(entry.overall?.predictionTop3Rate),
    }));

    const sorted = [...entries].sort((a, b) => b.value - a.value);
    return normalizeBars(sorted);
  }, [compareMetricUsers]);

  const compareAvgRankBars = useMemo(() => {
    if (compareMetricUsers.length === 0) {
      return [];
    }

    const hasValue = (value) =>
      typeof value === "number" && Number.isFinite(value) && value > 0;

    const entries = compareMetricUsers.map((entry) => ({
      key: entry.key,
      label: entry.label,
      isBase: entry.isBase,
      note: entry.note,
      value: hasValue(
        showCombinedMode
          ? entry.overall?.avgCombinedSeasonEndRank
          : entry.overall?.avgSeasonEndRank,
      )
        ? showCombinedMode
          ? entry.overall.avgCombinedSeasonEndRank
          : entry.overall.avgSeasonEndRank
        : null,
    }));

    const sorted = [...entries].sort((a, b) => {
      const aValue =
        typeof a.value === "number" && Number.isFinite(a.value)
          ? a.value
          : Number.POSITIVE_INFINITY;
      const bValue =
        typeof b.value === "number" && Number.isFinite(b.value)
          ? b.value
          : Number.POSITIVE_INFINITY;

      if (aValue !== bValue) {
        return aValue - bValue;
      }
      return a.label.localeCompare(b.label, "de-CH");
    });

    return normalizeBars(sorted, { lowerIsBetter: true });
  }, [compareMetricUsers, showCombinedMode]);

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

  const hasCompareSelection = selectedCompareIds.length > 0;
  const seasonWinRate =
    toSafeNumber(overall.participatedSeasonsCount) > 0
      ? toSafeNumber(overall.seasonsWon) /
        toSafeNumber(overall.participatedSeasonsCount)
      : 0;
  const top3RatePercent = clampPercent(toSafeNumber(overall.top3Rate) * 100);
  const predictionTop3RatePercent = clampPercent(
    toSafeNumber(overall.predictionTop3Rate) * 100,
  );
  const seasonWinRatePercent = clampPercent(seasonWinRate * 100);
  const formatOverviewPlayer = (player) => {
    if (!player?.displayName) {
      return "-";
    }
    return `${player.displayName} (${toSafeNumber(player.totalPoints)})`;
  };

  const renderRadialKpi = ({
    title,
    percent,
    percentLabel,
    detailLabel,
    className = "",
  }) => {
    const normalizedPercent = clampPercent(percent);

    return (
      <article className={`stats-kpi stats-kpi-radial ${className}`.trim()}>
        <p>{title}</p>
        <div className="stats-radial-kpi">
          <div
            className="stats-radial-track"
            style={{ "--radial-percent": normalizedPercent }}
            role="img"
            aria-label={`${title}: ${percentLabel}`}
          >
            <div className="stats-radial-inner">
              <strong>{percentLabel}</strong>
              {detailLabel ? <span>{detailLabel}</span> : null}
            </div>
          </div>
        </div>
      </article>
    );
  };

  const renderRankLineChartCard = (config) => {
    if (!config) {
      return null;
    }

    const points = asArray(config.points);
    const chartWidth = 360;
    const chartHeight = 180;
    const padding = { top: 14, right: 14, bottom: 22, left: 24 };
    const innerWidth = chartWidth - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;

    if (points.length === 0) {
      return (
        <article className="stats-chart-card">
          <h3>{config.title}</h3>
          <p className="stats-inline-state">{config.emptyMessage}</p>
        </article>
      );
    }

    const values = points.map((point) => point.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue;
    const xStep = points.length > 1 ? innerWidth / (points.length - 1) : 0;

    const chartPoints = points.map((point, index) => {
      const x = padding.left + index * xStep;
      const y =
        range === 0
          ? padding.top + innerHeight / 2
          : padding.top + ((point.value - minValue) / range) * innerHeight;
      return { ...point, x, y };
    });

    const polyline = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");
    const areaPolyline = [
      `${chartPoints[0].x},${padding.top + innerHeight}`,
      ...chartPoints.map((point) => `${point.x},${point.y}`),
      `${chartPoints[chartPoints.length - 1].x},${padding.top + innerHeight}`,
    ].join(" ");

    const yTicks = [...new Set([minValue, maxValue])]
      .sort((a, b) => a - b)
      .map((value) => {
        const y =
          range === 0
            ? padding.top + innerHeight / 2
            : padding.top + ((value - minValue) / range) * innerHeight;
        return { value, y };
      });

    return (
      <article className="stats-chart-card">
        <h3>{config.title}</h3>
        <p className="stats-chart-hint">1 = bester Rang</p>
        <div className="stats-line-chart">
          <svg
            className="stats-line-chart-svg"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            role="img"
            aria-label={`${config.title} als Liniendiagramm`}
            preserveAspectRatio="none"
          >
            {yTicks.map((tick) => (
              <g key={`tick-${tick.value}`}>
                <line
                  x1={padding.left}
                  y1={tick.y}
                  x2={chartWidth - padding.right}
                  y2={tick.y}
                  className="stats-line-grid"
                />
                <text
                  x={padding.left - 8}
                  y={tick.y + 4}
                  className="stats-line-y-label"
                  textAnchor="end"
                >
                  {tick.value}
                </text>
              </g>
            ))}
            {chartPoints.length > 1 ? (
              <polygon points={areaPolyline} className="stats-line-area" />
            ) : null}
            {chartPoints.length > 1 ? (
              <polyline points={polyline} className="stats-line-path" />
            ) : (
              <line
                x1={chartPoints[0].x}
                y1={chartPoints[0].y}
                x2={chartPoints[0].x}
                y2={chartPoints[0].y}
                className="stats-line-path"
              />
            )}
            {chartPoints.map((point) => (
              <g key={point.key}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  className="stats-line-point"
                />
                <text
                  x={point.x}
                  y={point.y - 10}
                  className="stats-line-point-label"
                  textAnchor="middle"
                >
                  {point.value}
                </text>
              </g>
            ))}
          </svg>
          <div className="stats-line-x-labels">
            {points.map((point) => (
              <span key={`label-${point.key}`} className="stats-line-x-label">
                {point.label}
              </span>
            ))}
          </div>
        </div>
      </article>
    );
  };

  const renderCompareMetricCard = (title, bars, formatValue) => (
    <article className="stats-chart-card">
      <h3>{title}</h3>
      {!hasCompareSelection ? (
        <p className="stats-inline-state">
          Wähle im Filter einen oder mehrere User für den Vergleich.
        </p>
      ) : bars.length === 0 ? (
        <p className="stats-inline-state">Keine Vergleichsdaten verfügbar.</p>
      ) : (
        <div className="stats-bar-list">
          {bars.map((entry) => (
            <div key={entry.key} className="stats-bar-row">
              <span className="stats-bar-label">
                {entry.label}
                {entry.note ? (
                  <em className="stats-bar-note"> ({entry.note})</em>
                ) : null}
              </span>
              <div className="stats-bar-track">
                <div
                  className={`stats-bar-fill ${entry.isBase ? "is-base" : ""}`}
                  style={{ width: `${entry.percent}%` }}
                />
              </div>
              <strong className="stats-bar-value">
                {formatValue(entry.value)}
              </strong>
            </div>
          ))}
        </div>
      )}
    </article>
  );

  return (
    <div className="stats-page">
      <header className="stats-header">
        <h1>Statistiken</h1>
        <p>
          Übersicht für <strong>{getDisplayName(baseUserEntry || user)}</strong>
        </p>
      </header>

      <div className="stats-top-grid stats-order-season-picker">
        <section className="stats-panel stats-season-toolbar">
          <div className="stats-season-toolbar-main">
            <div className="stats-season-heading">
              <p>Filter</p>
            </div>
            <label className="stats-field stats-season-field">
              <span>Auswahl Season</span>
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
            <div
              className="stats-mode-toggle"
              role="group"
              aria-label="Punkte-Darstellung"
            >
              <label className="stats-switch">
                <input
                  type="checkbox"
                  checked={includePredictions}
                  onChange={(event) =>
                    setIncludePredictions(event.target.checked)
                  }
                />
                <span className="stats-switch-label">
                  Predictions einbeziehen
                </span>
                <span className="stats-switch-track" aria-hidden="true">
                  <span className="stats-switch-thumb" />
                </span>
              </label>
            </div>
          </div>
        </section>

        <section className="stats-panel stats-global-panel">
          <h2>Allgemeine Statistiken</h2>
          {isLoadingOverview ? (
            <p className="stats-inline-state">
              Allgemeine Statistiken werden geladen...
            </p>
          ) : (
            <div className="stats-global-grid">
              <article className="stats-global-item">
                <p>Abgeschlossene Seasons gesamt</p>
                <strong>
                  {toSafeNumber(globalOverview.completedSeasonsCount)}
                </strong>
              </article>
              <article className="stats-global-item">
                <p>Ø Spieleranzahl pro Season</p>
                <strong>
                  {formatNumber(globalOverview.avgPlayersPerSeason, 2)}
                </strong>
              </article>
              <article className="stats-global-item">
                <p>Spieler mit meisten Punkten</p>
                <strong>
                  {formatOverviewPlayer(globalOverview.mostPointsPlayer)}
                </strong>
              </article>
              <article className="stats-global-item">
                <p>Spieler mit wenigsten Punkten</p>
                <strong>
                  {formatOverviewPlayer(globalOverview.leastPointsPlayer)}
                </strong>
              </article>
            </div>
          )}
        </section>
      </div>

      {error ? (
        <section className="stats-panel stats-panel-error">
          <p>{error}</p>
        </section>
      ) : null}

      <section className="stats-panel stats-order-key">
        <h2>Persönliche Statistiken</h2>
        <p className="stats-subline">
          Modus:{" "}
          <strong>
            {showCombinedMode ? "Rennen + Predictions" : "Nur Rennen"}
          </strong>
        </p>
        <div className="stats-kpi-layout">
          <div className="stats-kpi-grid stats-kpi-grid-main stats-kpi-grid-metrics">
          <article className="stats-kpi">
            <p>{showCombinedMode ? "Gesamtpunkte (inkl. Predictions)" : "Gesamtpunkte"}</p>
            <strong>{displayedTotalPoints}</strong>
          </article>
          <article className="stats-kpi">
            <p>Rennen</p>
            <strong>{overall.raceCount ?? 0}</strong>
          </article>
          <article className="stats-kpi">
            <p>Podien</p>
            <strong>{overall.podiumCount ?? 0}</strong>
          </article>
          <article className="stats-kpi">
            <p>{showCombinedMode ? "Ø Gesamtpunkte / Rennen" : "Ø Punkte / Rennen"}</p>
            <strong>{formatNumber(displayedAvgPoints, 2)}</strong>
          </article>
          <article className="stats-kpi">
            <p>{displayedRankTitle}</p>
            <strong>{formatNumber(displayedAvgSeasonRank, 2)}</strong>
          </article>
          </div>
          <div className="stats-kpi-grid stats-kpi-grid-radials">
          {renderRadialKpi({
            title: "Top-3-Rate",
            percent: top3RatePercent,
            percentLabel: formatPercent(overall.top3Rate),
            detailLabel: `${toSafeNumber(overall.podiumCount)} / ${toSafeNumber(
              overall.raceCount,
            )} Rennen`,
          })}
          {renderRadialKpi({
            title: "Season-Sieg-Quote",
            percent: seasonWinRatePercent,
            percentLabel: formatPercent(seasonWinRate),
            detailLabel: `${toSafeNumber(overall.seasonsWon)} / ${toSafeNumber(
              overall.participatedSeasonsCount,
            )} Seasons`,
          })}
          {renderRadialKpi({
            title: "Prediction Top-3-Rate",
            percent: predictionTop3RatePercent,
            percentLabel: formatPercent(overall.predictionTop3Rate),
            detailLabel: `${toSafeNumber(overall.predictionPodiumCount)} / ${toSafeNumber(
              overall.predictionRoundCount,
            )} Runden`,
          })}
          </div>
        </div>
        <div className="stats-kpi-grid stats-kpi-grid-races">
          <article className="stats-kpi stats-kpi-detail">
            <p>Best Race</p>
            <strong>{formatRaceLabel(overall.bestRace, true)}</strong>
          </article>
          <article className="stats-kpi stats-kpi-detail">
            <p>Worst Race</p>
            <strong>{formatRaceLabel(overall.worstRace, true)}</strong>
          </article>
          <article className="stats-kpi stats-kpi-detail">
            <p>Best Prediction Round</p>
            <strong>{formatRaceLabel(overall.bestPredictionRound, true)}</strong>
          </article>
          <article className="stats-kpi stats-kpi-detail">
            <p>Worst Prediction Round</p>
            <strong>{formatRaceLabel(overall.worstPredictionRound, true)}</strong>
          </article>
        </div>
        <p className="stats-footnote">
          Abgeschlossene Seasons: {overall.completedSeasonsCount ?? 0} |
          Teilgenommen: {overall.participatedSeasonsCount ?? 0}
        </p>
      </section>

      <section className="stats-panel stats-order-personal">
        <h2>Persönliche Grafik</h2>
        <div className="stats-chart-grid">
          <article className="stats-chart-card">
            <h3>{ownBarsConfig.title}</h3>
            {ownBarsConfig.entries.length === 0 ? (
              <p className="stats-inline-state">{ownBarsConfig.emptyMessage}</p>
            ) : (
              <div className="stats-bar-list">
                {ownBarsConfig.entries.map((entry) => (
                  <div key={entry.key} className="stats-bar-row">
                    <span className="stats-bar-label">{entry.label}</span>
                    <div className="stats-bar-track">
                      <div
                        className="stats-bar-fill"
                        style={{ width: `${entry.percent}%` }}
                      />
                    </div>
                    <strong className="stats-bar-value">
                      {entry.value == null ? "-" : entry.value}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </article>
          <article className="stats-chart-card">
            <h3>{predictionBarsConfig.title}</h3>
            {predictionBarsConfig.entries.length === 0 ? (
              <p className="stats-inline-state">
                {predictionBarsConfig.emptyMessage}
              </p>
            ) : (
              <div className="stats-bar-list">
                {predictionBarsConfig.entries.map((entry) => (
                  <div key={entry.key} className="stats-bar-row">
                    <span className="stats-bar-label">{entry.label}</span>
                    <div className="stats-bar-track">
                      <div
                        className="stats-bar-fill is-prediction"
                        style={{ width: `${entry.percent}%` }}
                      />
                    </div>
                    <strong className="stats-bar-value">
                      {entry.value == null ? "-" : entry.value}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </article>
          {seasonFilter === "all" ? renderRankLineChartCard(ownRankLineConfig) : null}
        </div>
      </section>

      <section className="stats-panel stats-order-prediction-only">
        <h2>Reine Prediction-Statistiken</h2>
        <div className="stats-kpi-grid stats-kpi-grid-main stats-kpi-grid-metrics">
          <article className="stats-kpi">
            <p>Prediction-Runden</p>
            <strong>{toSafeNumber(overall.predictionRoundCount)}</strong>
          </article>
          <article className="stats-kpi">
            <p>Prediction-Punkte</p>
            <strong>{toSafeNumber(overall.predictionPoints)}</strong>
          </article>
          <article className="stats-kpi">
            <p>Ø Punkte / Runde</p>
            <strong>{formatNumber(overall.avgPredictionPointsPerRound, 2)}</strong>
          </article>
          <article className="stats-kpi">
            <p>Prediction-Podien</p>
            <strong>{toSafeNumber(overall.predictionPodiumCount)}</strong>
          </article>
          <article className="stats-kpi">
            <p>Prediction Top-3-Rate</p>
            <strong>{formatPercent(overall.predictionTop3Rate)}</strong>
          </article>
        </div>
      </section>

      <section className="stats-panel stats-order-compare">
        <h2>Vergleichs-Statistiken</h2>
        <div className="stats-compare-controls">
          <div className="stats-field">
            <span>User-Auswahl (max. {MAX_COMPARE_USERS})</span>
            {isLoadingCandidates ? (
              <p className="stats-inline-state">
                Vergleichs-User werden geladen...
              </p>
            ) : availableCompareCandidates.length === 0 ? (
              <p className="stats-inline-state">
                Keine Vergleichs-User für diesen Season-Filter gefunden.
              </p>
            ) : (
              <div className="stats-compare-list">
                {availableCompareCandidates.map((candidate) => (
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
        <div className="stats-chart-grid">
          {renderCompareMetricCard(
            showCombinedMode
              ? "Vergleich Gesamtpunkte (inkl. Predictions)"
              : "Vergleich Gesamtpunkte",
            compareTotalPointsBars,
            (value) => String(toSafeNumber(value)),
          )}
          {renderCompareMetricCard(
            showCombinedMode
              ? "Vergleich Ø Gesamtpunkte pro Rennen"
              : "Vergleich Ø Punkte pro Rennen",
            compareAvgPointsBars,
            (value) => formatNumber(value, 2),
          )}
          {renderCompareMetricCard(
            "Vergleich Podiumsrate",
            comparePodiumRateBars,
            (value) => formatPercent(value),
          )}
          {renderCompareMetricCard(
            showCombinedMode
              ? "Vergleich Ø Season-Endrang (inkl. Predictions)"
              : "Vergleich Ø Season-Endrang",
            compareAvgRankBars,
            (value) => formatNumber(value, 2),
          )}
          {renderCompareMetricCard(
            "Vergleich Prediction-Punkte",
            comparePredictionPointsBars,
            (value) => String(toSafeNumber(value)),
          )}
          {renderCompareMetricCard(
            "Vergleich Ø Prediction-Punkte / Runde",
            comparePredictionAvgBars,
            (value) => formatNumber(value, 2),
          )}
          {renderCompareMetricCard(
            "Vergleich Prediction Top-3-Rate",
            comparePredictionTop3Bars,
            (value) => formatPercent(value),
          )}
        </div>
      </section>

      <section className="stats-panel stats-order-season-overview">
        <h2>Season Übersicht</h2>
        {isLoadingStats ? (
          <p className="stats-inline-state">Statistiken werden geladen...</p>
        ) : seasonStats.length === 0 ? (
          <p className="stats-inline-state">
            Keine abgeschlossenen Seasons für Statistiken verfügbar.
          </p>
        ) : (
          <div className="stats-table-wrap">
            <table className="stats-table">
              <thead>
                <tr>
                  <th>Season</th>
                  <th>Status</th>
                  <th>Rennen</th>
                  <th>{showCombinedMode ? "Rennen" : "Punkte"}</th>
                  {showCombinedMode ? <th>Predictions</th> : null}
                  {showCombinedMode ? <th>Gesamt</th> : null}
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
                        <td colSpan={showCombinedMode ? 9 : 7}>
                          Nicht teilgenommen
                        </td>
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
                      {showCombinedMode ? <td>{season.predictionPoints}</td> : null}
                      {showCombinedMode ? <td>{season.combinedPoints}</td> : null}
                      <td>{season.podiumCount}</td>
                      <td>{formatPercent(season.top3Rate)}</td>
                      <td>
                        {showCombinedMode
                          ? season.finalCombinedRank ?? "-"
                          : season.finalRank ?? "-"}
                      </td>
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

      {seasonFilter !== "all" ? (
        <section className="stats-panel stats-order-race">
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
                      {showCombinedMode ? <th>Predictions</th> : null}
                      {showCombinedMode ? <th>Kumuliert Predictions</th> : null}
                      {showCombinedMode ? <th>Gesamt</th> : null}
                      {showCombinedMode ? <th>Kumuliert Gesamt</th> : null}
                      <th>Rang im Rennen</th>
                      <th>{showCombinedMode ? "Zwischenrang Gesamt" : "Zwischenrang"}</th>
                      <th>Podium</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asArray(detailSeason.races).map((race, index, races) => {
                      const previousRace =
                        index > 0 && Array.isArray(races) ? races[index - 1] : null;
                      const currentRankValue = race?.raceRank;
                      const previousRankValue = previousRace?.raceRank;
                      const hasCurrentRank =
                        typeof currentRankValue === "number" &&
                        Number.isFinite(currentRankValue);
                      const hasPreviousRank =
                        typeof previousRankValue === "number" &&
                        Number.isFinite(previousRankValue);
                      const rankDelta =
                        hasCurrentRank && hasPreviousRank
                          ? previousRankValue - currentRankValue
                          : null;

                      return (
                        <tr key={race.raceId}>
                          <td>{race.raceName}</td>
                          <td>{race.points}</td>
                          <td>{race.cumulativePoints}</td>
                          {showCombinedMode ? <td>{race.predictionPoints}</td> : null}
                          {showCombinedMode ? (
                            <td>{race.cumulativePredictionPoints}</td>
                          ) : null}
                          {showCombinedMode ? <td>{race.combinedPoints}</td> : null}
                          {showCombinedMode ? (
                            <td>{race.cumulativeCombinedPoints}</td>
                          ) : null}
                          <td>
                            <span className="stats-race-rank-cell">
                              <span>{currentRankValue}</span>
                              {rankDelta !== null ? (
                                <span
                                  className={`stats-rank-delta ${
                                    rankDelta > 0
                                      ? "is-positive"
                                      : rankDelta < 0
                                        ? "is-negative"
                                        : "is-neutral"
                                  }`}
                                >
                                  {rankDelta > 0 ? `+${rankDelta}` : rankDelta}
                                </span>
                              ) : null}
                            </span>
                          </td>
                          <td>
                            {showCombinedMode
                              ? race.combinedRank ?? "-"
                              : race.cumulativeRank ?? "-"}
                          </td>
                          <td>{race.isPodium ? "Ja" : "Nein"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
