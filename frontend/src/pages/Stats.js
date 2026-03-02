import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightLong,
  faCalendarDays,
  faChartLine,
  faCircleUser,
  faFlagCheckered,
  faListCheck,
  faNoteSticky,
  faTrophy,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
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

const formatSplit = (left, right) =>
  `${toSafeNumber(left)} / ${toSafeNumber(right)}`;

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

function AnimatedVisibility({
  show,
  children,
  className = "",
  maxHeight = "320px",
}) {
  const [isMounted, setIsMounted] = useState(show);
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    let hideTimer;
    let showTimer;

    if (show) {
      setIsMounted(true);
      showTimer = setTimeout(() => setIsVisible(true), 20);
    } else {
      setIsVisible(false);
      hideTimer = setTimeout(() => setIsMounted(false), 420);
    }

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(showTimer);
    };
  }, [show]);

  if (!isMounted) {
    return null;
  }

  return (
    <div
      className={`stats-animated-block ${isVisible ? "is-visible" : "is-hidden"} ${className}`.trim()}
      style={{ "--stats-anim-max-height": maxHeight }}
    >
      {children}
    </div>
  );
}

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
  const racePoints = toSafeNumber(overall.totalPoints);
  const predictionPoints = toSafeNumber(overall.predictionPoints);
  const combinedPoints = toSafeNumber(overall.combinedPoints);
  const pointsSplitLabel = formatSplit(racePoints, predictionPoints);
  const displayedTotalPoints = showCombinedMode
    ? combinedPoints
    : racePoints;
  const displayedAvgPoints = showCombinedMode
    ? toSafeNumber(overall.avgCombinedPointsPerRace)
    : toSafeNumber(overall.avgPointsPerRace);
  const displayedAvgSeasonRank = showCombinedMode
    ? overall.avgCombinedSeasonEndRank
    : overall.avgSeasonEndRank;
  const displayedRankTitle = showCombinedMode
    ? "Schnitt Endrang (Gesamt)"
    : "Schnitt Endrang";

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
      ? "Gesamtpunkte"
      : "Rennpunkte";

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
      title: "Gesamtpunkte pro Season",
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
        ? "Endrang pro Season (Gesamt)"
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
          title: "Tippspiel-Punkte pro Runde",
          entries: [],
          emptyMessage: "Keine Daten für diese Season gefunden.",
        };
      }

      if (selectedSeason.participationStatus !== "participated") {
        return {
          title: "Tippspiel-Punkte pro Runde",
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
        title: `${selectedSeason.seasonName}: Tippspiel-Punkte pro Runde`,
        entries: normalizeBars(entries),
        emptyMessage: "Keine Tippspiel-Runden vorhanden.",
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
      title: "Tippspiel-Punkte pro Season",
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
  const displayedSeasonsWon = seasonStats.filter((season) => {
    if (season?.participationStatus !== "participated") return false;
    const seasonRank = showCombinedMode
      ? season?.finalCombinedRank
      : season?.finalRank;
    return seasonRank === 1;
  }).length;
  const seasonWinRate =
    toSafeNumber(overall.participatedSeasonsCount) > 0
      ? toSafeNumber(displayedSeasonsWon) /
        toSafeNumber(overall.participatedSeasonsCount)
      : 0;
  const raceTop3RatePercent = toSafeNumber(overall.top3Rate) * 100;
  const seasonWinRatePercent = toSafeNumber(seasonWinRate) * 100;
  const predictionTop3RatePercent =
    toSafeNumber(overall.predictionTop3Rate) * 100;
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
    const radius = 57;
    const arcLength = Math.PI * radius;
    const progressLength = (normalizedPercent / 100) * arcLength;

    return (
      <article className={`stats-kpi stats-kpi-radial ${className}`.trim()}>
        <p className="stats-kpi-title">{title}</p>
        <div className="stats-speedometer-wrap">
          <svg
            className="stats-speedometer"
            viewBox="0 0 180 100"
            role="img"
            aria-label={`${title}: ${percentLabel}`}
          >
            <path
              d="M 33 82 A 57 57 0 0 1 147 82"
              className="stats-speedometer-track"
            />
            <path
              d="M 33 82 A 57 57 0 0 1 147 82"
              className="stats-speedometer-progress"
              style={{
                strokeDasharray: `${progressLength} ${arcLength}`,
              }}
            />
          </svg>
          <div className="stats-speedometer-readout">
            <strong>{percentLabel}</strong>
            {detailLabel ? <span>{detailLabel}</span> : null}
          </div>
        </div>
      </article>
    );
  };

  const renderBarList = ({ bars, formatValue, barClassName = "" }) => (
    <div className="stats-bar-list">
      {bars.map((entry) => (
        <div
          key={entry.key}
          className={`stats-bar-row ${entry.isBase ? "is-base-row" : ""}`.trim()}
        >
          <span className="stats-bar-label">
            {entry.label}
            {entry.note ? <em className="stats-bar-note"> ({entry.note})</em> : null}
          </span>
          <div className="stats-bar-track">
            <div
              className={`stats-bar-fill ${barClassName} ${entry.isBase ? "is-base" : ""}`.trim()}
              style={{ width: `${entry.percent}%` }}
            />
          </div>
          <strong className="stats-bar-value">{formatValue(entry.value)}</strong>
        </div>
      ))}
    </div>
  );

  const renderMetricCard = ({
    title,
    icon = faChartLine,
    bars,
    formatValue,
    emptyMessage,
    barClassName = "",
    requireCompareSelection = false,
  }) => (
    <article className="stats-chart-card">
      <h3>
        <span>{title}</span>
      </h3>
      {requireCompareSelection && !hasCompareSelection ? (
        <p className="stats-inline-state">
          Wähle im Filter einen oder mehrere User für den Vergleich.
        </p>
      ) : bars.length === 0 ? (
        <p className="stats-inline-state">{emptyMessage}</p>
      ) : (
        renderBarList({
          bars,
          formatValue,
          barClassName,
        })
      )}
    </article>
  );

  const renderRankLineChartCard = (config) => {
    if (!config) {
      return null;
    }

    const points = asArray(config.points);
    const chartWidth = 380;
    const chartHeight = 200;
    const padding = { top: 16, right: 14, bottom: 26, left: 30 };
    const innerWidth = chartWidth - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;

    if (points.length === 0) {
      return (
        <article className="stats-chart-card">
          <h3>
            <span>{config.title}</span>
          </h3>
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
        <h3>
          <span>{config.title}</span>
        </h3>
        <p className="stats-chart-hint">1 = bester Rang</p>
        <div className="stats-line-chart">
          <svg
            className="stats-line-chart-svg"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            role="img"
            aria-label={`${config.title} als Liniendiagramm`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="stats-rank-line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ff8080" />
                <stop offset="100%" stopColor="#ff2f2f" />
              </linearGradient>
            </defs>
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
              <polyline
                points={polyline}
                className="stats-line-path"
                style={{ stroke: "url(#stats-rank-line-gradient)" }}
              />
            ) : (
              <line
                x1={chartPoints[0].x}
                y1={chartPoints[0].y}
                x2={chartPoints[0].x}
                y2={chartPoints[0].y}
                className="stats-line-path"
                style={{ stroke: "url(#stats-rank-line-gradient)" }}
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

  const renderCompareMetricCard = (title, bars, formatValue, icon, barClassName = "") =>
    renderMetricCard({
      title,
      icon,
      bars,
      formatValue,
      emptyMessage: "Keine Vergleichsdaten verfügbar.",
      barClassName,
      requireCompareSelection: true,
    });

  return (
    <div className="stats-page">
      <header className="stats-header">
        <h1>
          <span>Statistik-Übersicht</span>
        </h1>
        <p>
          Übersicht für <strong>{getDisplayName(baseUserEntry || user)}</strong>
        </p>
      </header>

      <div className="stats-top-grid stats-order-season-picker">
        <section className="stats-panel stats-season-toolbar">
          <h2>
            <FontAwesomeIcon icon={faListCheck} />
            <span>Filter</span>
          </h2>
          <div className="stats-season-toolbar-main">
            <label className="stats-field stats-season-field">
              <span>
                <span>Season</span>
              </span>
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
          </div>
        </section>

        <section className="stats-panel stats-global-panel">
          <h2>
            <FontAwesomeIcon icon={faUsers} />
            <span>Allgemeine Statistiken</span>
          </h2>
          {isLoadingOverview ? (
            <p className="stats-inline-state">
              Allgemeine Statistiken werden geladen...
            </p>
          ) : (
            <div className="stats-global-grid">
              <article className="stats-global-item">
                <p>
                  <FontAwesomeIcon icon={faCalendarDays} />
                  <span>Abgeschlossene Seasons</span>
                </p>
                <strong>
                  {toSafeNumber(globalOverview.completedSeasonsCount)}
                </strong>
              </article>
              <article className="stats-global-item">
                <p>
                  <FontAwesomeIcon icon={faUsers} />
                  <span>Schnitt Spieler / Season</span>
                </p>
                <strong>
                  {formatNumber(globalOverview.avgPlayersPerSeason, 2)}
                </strong>
              </article>
              <article className="stats-global-item">
                <p>
                  <FontAwesomeIcon icon={faTrophy} />
                  <span>Top Spieler</span>
                </p>
                <strong>
                  {formatOverviewPlayer(globalOverview.mostPointsPlayer)}
                </strong>
              </article>
              <article className="stats-global-item">
                <p>
                  <FontAwesomeIcon icon={faCircleUser} />
                  <span>Flop Spieler</span>
                </p>
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
        <h2>
          <FontAwesomeIcon icon={faFlagCheckered} />
          <span>Persönliche Statistiken</span>
        </h2>
        <p className="stats-subline">
          Modus:{" "}
          <strong>
            {showCombinedMode ? "Rennen + Tippspiele" : "Nur Rennen"}
          </strong>
        </p>
        <div className="stats-kpi-grid stats-kpi-grid-main stats-kpi-grid-metrics">
          <div className="stats-kpi-grid stats-kpi-grid-standard">
            <AnimatedVisibility
              show={showCombinedMode}
              className="stats-animated-kpi"
              maxHeight="96px"
            >
              <article className="stats-kpi stats-kpi-standard stats-kpi-highlight">
                <p className="stats-kpi-title">Punkte (Rennen/Tippspiel)</p>
                <strong>{pointsSplitLabel}</strong>
              </article>
            </AnimatedVisibility>
            <article className="stats-kpi stats-kpi-standard">
              <p className="stats-kpi-title">Gesamtpunkte</p>
              <strong>{displayedTotalPoints}</strong>
            </article>
            <article className="stats-kpi stats-kpi-standard">
              <p className="stats-kpi-title">Rennen</p>
              <strong>{overall.raceCount ?? 0}</strong>
            </article>
            <article className="stats-kpi stats-kpi-standard">
              <p className="stats-kpi-title">Anzahl Podienplätze</p>
              <strong>{overall.podiumCount ?? 0}</strong>
            </article>
            <article className="stats-kpi stats-kpi-standard">
              <p className="stats-kpi-title">Schnitt Punkte / Rennen</p>
              <strong>{formatNumber(displayedAvgPoints, 2)}</strong>
            </article>
            <article className="stats-kpi stats-kpi-standard">
              <p className="stats-kpi-title">{displayedRankTitle}</p>
              <strong>{formatNumber(displayedAvgSeasonRank, 2)}</strong>
            </article>
          </div>

          <div className="stats-kpi-grid stats-kpi-grid-radial-metrics">
            <div>
              {renderRadialKpi({
                title: "Top-3-Rate",
                percent: raceTop3RatePercent,
                percentLabel: formatPercent(overall.top3Rate),
                detailLabel: `${toSafeNumber(overall.podiumCount)} / ${toSafeNumber(overall.raceCount)} Rennen`,
              })}
            </div>
            <div>
              {renderRadialKpi({
                title: "Season-Sieg-Quote",
                percent: seasonWinRatePercent,
                percentLabel: formatPercent(seasonWinRate),
                detailLabel: `${toSafeNumber(displayedSeasonsWon)} / ${toSafeNumber(overall.participatedSeasonsCount)} Seasons`,
              })}
            </div>
            <AnimatedVisibility
              show={showCombinedMode}
              className="stats-animated-kpi"
              maxHeight="160px"
            >
              {renderRadialKpi({
                title: "Prediction Top-3-Rate",
                percent: predictionTop3RatePercent,
                percentLabel: formatPercent(overall.predictionTop3Rate),
                detailLabel: `${toSafeNumber(overall.predictionPodiumCount)} / ${toSafeNumber(overall.predictionRoundCount)} Runden`,
              })}
            </AnimatedVisibility>
          </div>
        </div>
        <div className="stats-kpi-grid stats-kpi-grid-races">
          <article className="stats-kpi stats-kpi-standard stats-kpi-detail">
            <p className="stats-kpi-title">Bestes Rennen</p>
            <strong>{formatRaceLabel(overall.bestRace, true)}</strong>
          </article>
          <article className="stats-kpi stats-kpi-standard stats-kpi-detail">
            <p className="stats-kpi-title">Schlechtestes Rennen</p>
            <strong>{formatRaceLabel(overall.worstRace, true)}</strong>
          </article>
        </div>
        <p className="stats-footnote">
          Abgeschlossene Seasons: {overall.completedSeasonsCount ?? 0} |
          Teilgenommen: {overall.participatedSeasonsCount ?? 0}
        </p>
      </section>

      <section className="stats-panel stats-order-personal">
        <h2>
          <FontAwesomeIcon icon={faChartLine} />
          <span>Persönliche Charts</span>
        </h2>
        <div className="stats-chart-grid">
          <div>
            {renderMetricCard({
              title: ownBarsConfig.title,
              bars: ownBarsConfig.entries,
              formatValue: (value) => (value == null ? "-" : String(value)),
              emptyMessage: ownBarsConfig.emptyMessage,
            })}
          </div>
          <AnimatedVisibility
            show={showCombinedMode}
            className="stats-animated-chart"
            maxHeight="520px"
          >
            {renderMetricCard({
              title: predictionBarsConfig.title,
              bars: predictionBarsConfig.entries,
              formatValue: (value) => (value == null ? "-" : String(value)),
              emptyMessage: predictionBarsConfig.emptyMessage,
              barClassName: "is-prediction",
            })}
          </AnimatedVisibility>
          {seasonFilter === "all" ? (
            <div>
              {renderRankLineChartCard(ownRankLineConfig)}
            </div>
          ) : null}
        </div>
      </section>

      <AnimatedVisibility
        show={showCombinedMode}
        className="stats-order-prediction-only stats-animated-section"
        maxHeight="1200px"
      >
        <section className="stats-panel">
          <h2>
            <FontAwesomeIcon icon={faNoteSticky} />
            <span>Tippspiel Statistiken</span>
          </h2>
          <div className="stats-kpi-grid stats-kpi-grid-standard">
            <article className="stats-kpi stats-kpi-standard">
              <p className="stats-kpi-title">Runden</p>
              <strong>{toSafeNumber(overall.predictionRoundCount)}</strong>
            </article>
            <article className="stats-kpi stats-kpi-standard">
              <p className="stats-kpi-title">Punkte</p>
              <strong>{toSafeNumber(overall.predictionPoints)}</strong>
            </article>
            <article className="stats-kpi stats-kpi-standard">
              <p className="stats-kpi-title">Schnitt / Runde</p>
              <strong>{formatNumber(overall.avgPredictionPointsPerRound, 2)}</strong>
            </article>
            <article className="stats-kpi stats-kpi-standard">
              <p className="stats-kpi-title">Podien</p>
              <strong>{toSafeNumber(overall.predictionPodiumCount)}</strong>
            </article>
            <article className="stats-kpi stats-kpi-standard">
              <p className="stats-kpi-title">Top-3-Rate</p>
              <strong>{formatPercent(overall.predictionTop3Rate)}</strong>
            </article>
          </div>
        </section>
      </AnimatedVisibility>

      <section className="stats-panel stats-order-compare">
        <h2>
          <FontAwesomeIcon icon={faUsers} />
          <span>Vergleichs-Statistiken</span>
        </h2>
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
        <p className="stats-subline">
          Aktiv ausgewählt: <strong>{selectedCompareIds.length}</strong> / {MAX_COMPARE_USERS}
        </p>
        <div className="stats-chart-grid">
          <div>
            {renderCompareMetricCard(
              "Punkte gesamt",
              compareTotalPointsBars,
              (value) => String(toSafeNumber(value)),
              faFlagCheckered,
            )}
          </div>
          <div>
            {renderCompareMetricCard(
              "Schnitt Punkte / Rennen",
              compareAvgPointsBars,
              (value) => formatNumber(value, 2),
              faArrowRightLong,
            )}
          </div>
          <div>
            {renderCompareMetricCard(
              "Podiumsrate",
              comparePodiumRateBars,
              (value) => formatPercent(value),
              faTrophy,
            )}
          </div>
          <div>
            {renderCompareMetricCard(
              "Schnitt Endrang",
              compareAvgRankBars,
              (value) => formatNumber(value, 2),
              faArrowRightLong,
            )}
          </div>
          <AnimatedVisibility
            show={showCombinedMode}
            className="stats-animated-chart"
            maxHeight="500px"
          >
            {renderCompareMetricCard(
              "Tippspiel Punkte",
              comparePredictionPointsBars,
              (value) => String(toSafeNumber(value)),
              faNoteSticky,
            )}
          </AnimatedVisibility>
          <AnimatedVisibility
            show={showCombinedMode}
            className="stats-animated-chart"
            maxHeight="500px"
          >
            {renderCompareMetricCard(
              "Schnitt Tippspielpunkte / Runde",
              comparePredictionAvgBars,
              (value) => formatNumber(value, 2),
              faArrowRightLong,
            )}
          </AnimatedVisibility>
          <AnimatedVisibility
            show={showCombinedMode}
            className="stats-animated-chart"
            maxHeight="500px"
          >
            {renderCompareMetricCard(
              "Tippspiel Top-3-Rate",
              comparePredictionTop3Bars,
              (value) => formatPercent(value),
              faChartLine,
            )}
          </AnimatedVisibility>
        </div>
      </section>

      <section className="stats-panel stats-order-season-overview">
        <h2>
          <FontAwesomeIcon icon={faFlagCheckered} />
          <span>Season Übersicht</span>
        </h2>
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
                  <th>{showCombinedMode ? "Punkte (Renn./Tipp)" : "Renn-Punkte"}</th>
                  {showCombinedMode ? <th>Gesamt</th> : null}
                  <th>Podien</th>
                  <th>Top-3-Rate</th>
                  <th>Endrang</th>
                  <th>Bestes Rennen</th>
                  <th>Schlechtestes Rennen</th>
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
                        <td colSpan={showCombinedMode ? 8 : 7}>
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
                      <td>
                        {showCombinedMode
                          ? formatSplit(season.totalPoints, season.predictionPoints)
                          : toSafeNumber(season.totalPoints)}
                      </td>
                      {showCombinedMode ? <td>{toSafeNumber(season.combinedPoints)}</td> : null}
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
          <h2>
            <FontAwesomeIcon icon={faFlagCheckered} />
            <span>Race Detail</span>
          </h2>
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
                      <th>{showCombinedMode ? "Punkte (R/P)" : "Punkte"}</th>
                      <th>{showCombinedMode ? "Kumuliert (R/P)" : "Kumuliert"}</th>
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
                          <td>
                            {showCombinedMode
                              ? formatSplit(race.points, race.predictionPoints)
                              : toSafeNumber(race.points)}
                          </td>
                          <td>
                            {showCombinedMode
                              ? formatSplit(
                                  race.cumulativePoints,
                                  race.cumulativePredictionPoints,
                                )
                              : toSafeNumber(race.cumulativePoints)}
                          </td>
                          {showCombinedMode ? <td>{toSafeNumber(race.combinedPoints)}</td> : null}
                          {showCombinedMode ? (
                            <td>{toSafeNumber(race.cumulativeCombinedPoints)}</td>
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

      <div
        className="stats-global-predictions-toggle"
        role="group"
        aria-label="Tippspiel Darstellung"
      >
        <label className="stats-switch">
          <input
            type="checkbox"
            checked={includePredictions}
            onChange={(event) => setIncludePredictions(event.target.checked)}
          />
          <span className="stats-switch-label">Tippspiele im Ranking</span>
          <span className="stats-switch-track" aria-hidden="true">
            <span className="stats-switch-thumb" />
          </span>
        </label>
      </div>
    </div>
  );
}
