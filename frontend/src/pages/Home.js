import { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import API from "../api";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import "../styles/Home.css";

export default function Home() {
  const { user, login } = useContext(AuthContext);
  const [localUser, setLocalUser] = useState(null);
  const [season, setSeason] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [visibleUserIds, setVisibleUserIds] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [cumulativeData, setCumulativeData] = useState([]);
  const [combinedStandings, setCombinedStandings] = useState(null);
  const [includePredictions, setIncludePredictions] = useState(true);
  const [activePoint, setActivePoint] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, seasonRes] = await Promise.all([
          API.get("/users/me"),
          API.get("/seasons/current"),
        ]);

        if (!user || user._id !== userRes.data._id) {
          login(userRes.data);
        }
        setLocalUser(userRes.data);

        setSeason(seasonRes.data);
        const seasonId = seasonRes.data?._id;

        if (!seasonId) {
          setParticipants([]);
          setAssignments([]);
          setCumulativeData([]);
          setCombinedStandings(null);
          return;
        }

        const filtered = (seasonRes.data.participants || []).filter(
          (participant) => typeof participant === "object" && participant?._id,
        );
        setParticipants(filtered);
        setVisibleUserIds(filtered.map((participant) => participant._id));

        const [assignmentRes, racesRes, combinedRes] = await Promise.all([
          API.get(`/userSeasonTeams?season=${seasonId}`),
          API.get(`/races/season/${seasonId}`),
          API.get(`/seasons/${seasonId}/combined-standings`),
        ]);

        setAssignments(assignmentRes.data);
        setCombinedStandings(combinedRes.data || null);

        const races = racesRes.data;

        const cumulative = {};
        filtered.forEach((u) => (cumulative[u._id] = 0));

        const chartData = races.map((race) => {
          const entry = { name: race.name, raceId: race?._id };
          race.results.forEach((res) => {
            const userId =
              typeof res.user === "object" ? res.user._id : res.user;
            if (userId && userId in cumulative) {
              cumulative[userId] += res.pointsEarned || 0;
            }
          });
          filtered.forEach((u) => {
            entry[u._id] = cumulative[u._id];
          });
          return entry;
        });

        setCumulativeData(chartData);
      } catch (error) {
        console.error("Fehler beim Laden:", error);
        setCombinedStandings(null);
      }
    };
    fetchData();
  }, [user, login]);

  useEffect(() => {
    if (activePoint && !visibleUserIds.includes(activePoint.userId)) {
      setActivePoint(null);
    }
  }, [activePoint, visibleUserIds]);

  const getUserAssignment = (userId) =>
    assignments.find((assignment) => {
      const assignmentUserId =
        typeof assignment?.user === "object"
          ? assignment.user?._id
          : assignment?.user;
      const assignmentSeasonId =
        typeof assignment?.season === "object"
          ? assignment.season?._id
          : assignment?.season;

      return assignmentUserId === userId && assignmentSeasonId === season?._id;
    });

  const getTeamName = (userId) => {
    const entry = getUserAssignment(userId);
    return entry?.team?.name || "-";
  };

  const getTeamColorSoft = (color) => {
    if (!color || typeof color !== "string") {
      return "rgba(255, 30, 30, 0.22)";
    }
    return color.startsWith("#") ? `${color}36` : "rgba(255, 30, 30, 0.22)";
  };

  const getTeamData = (userId) => {
    const assignment = getUserAssignment(userId);
    if (!assignment?.team) {
      return null;
    }

    const assignedTeamId =
      typeof assignment.team === "object"
        ? assignment.team._id
        : assignment.team;

    const seasonTeam =
      (season?.teams || []).find((team) => team?._id === assignedTeamId) ||
      null;

    const teamData =
      (seasonTeam && typeof seasonTeam === "object" && seasonTeam) ||
      (typeof assignment.team === "object" ? assignment.team : null);

    if (!teamData) {
      return null;
    }

    return {
      name: teamData.name || getTeamName(userId),
      color: teamData.color || "#ff1e1e",
      logoUrl: teamData.logoUrl || null,
    };
  };

  const generateColor = (index, total) =>
    `hsl(${(index * 360) / total}, 70%, 50%)`;

  const formatPointValue = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return "-";
    return Number.isInteger(num) ? String(num) : num.toFixed(2);
  };

  const visibleParticipants = participants.filter((participant) =>
    visibleUserIds.includes(participant._id),
  );

  const combinedStandingsByUserId = useMemo(() => {
    const map = new Map();
    (combinedStandings?.standings || []).forEach((row) => {
      const userId = typeof row?.user === "object" ? row.user?._id : row?.user;
      if (!userId) return;
      map.set(String(userId), row);
    });
    return map;
  }, [combinedStandings]);

  const includedPredictionRounds = useMemo(
    () => combinedStandings?.includedPredictionRounds || [],
    [combinedStandings],
  );
  const predictionPointsByRaceId = useMemo(() => {
    const map = new Map();
    includedPredictionRounds.forEach((round) => {
      const raceId = round?.race?._id;
      if (!raceId) return;
      const userMap = new Map();
      (round?.userPoints || []).forEach((entry) => {
        if (!entry?.userId) return;
        userMap.set(String(entry.userId), Number(entry.points) || 0);
      });
      map.set(String(raceId), userMap);
    });
    return map;
  }, [includedPredictionRounds]);

  const cumulativeDataWithPredictions = useMemo(() => {
    if (!Array.isArray(cumulativeData) || cumulativeData.length === 0)
      return [];

    const cumulativePrediction = {};
    participants.forEach((participant) => {
      cumulativePrediction[String(participant._id)] = 0;
    });

    return cumulativeData.map((raceEntry) => {
      const raceId = raceEntry?.raceId ? String(raceEntry.raceId) : "";
      const predictionMap = predictionPointsByRaceId.get(raceId);
      const nextEntry = { ...raceEntry };

      participants.forEach((participant) => {
        const userId = String(participant._id);
        if (predictionMap?.has(userId)) {
          cumulativePrediction[userId] += Number(
            predictionMap.get(userId) || 0,
          );
        }
        nextEntry[userId] =
          Number(raceEntry?.[userId] || 0) +
          Number(cumulativePrediction[userId] || 0);
      });

      return nextEntry;
    });
  }, [cumulativeData, participants, predictionPointsByRaceId]);

  const displayedChartData = includePredictions
    ? cumulativeDataWithPredictions
    : cumulativeData;

  const toggleVisibleUser = (userId) => {
    setVisibleUserIds((previous) =>
      previous.includes(userId)
        ? previous.filter((id) => id !== userId)
        : [...previous, userId],
    );
  };

  const renderTable = (rows, columns) => (
    <div className="scroll-wrapper table-scroll-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((c, idx) => (
              <th key={idx}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );

  const rankingSourceRows = useMemo(() => {
    if (combinedStandings?.standings?.length) {
      return combinedStandings.standings;
    }
    return [...participants].map((p) => ({
      user: p,
      racePoints: cumulativeData.at(-1)?.[p._id] || 0,
      predictionPoints: 0,
      combinedPoints: cumulativeData.at(-1)?.[p._id] || 0,
      combinedRank: null,
      raceRank: null,
    }));
  }, [combinedStandings, cumulativeData, participants]);

  const rankingTableColumns = includePredictions
    ? ["#", "Name", "Team", "Rennen", "Predictions", "Gesamt"]
    : ["#", "Name", "Team", "Rennen"];

  const rankingRows = rankingSourceRows
    .slice()
    .sort((a, b) => {
      const aPoints = includePredictions
        ? Number(a?.combinedPoints || 0)
        : Number(a?.racePoints || 0);
      const bPoints = includePredictions
        ? Number(b?.combinedPoints || 0)
        : Number(b?.racePoints || 0);
      const diff = bPoints - aPoints;
      if (diff !== 0) return diff;

      const raceDiff = Number(b?.racePoints || 0) - Number(a?.racePoints || 0);
      if (raceDiff !== 0) return raceDiff;
      const aName = a?.user?.realname || a?.user?.username || "";
      const bName = b?.user?.realname || b?.user?.username || "";
      return aName.localeCompare(bName, "de-CH");
    })
    .map((row, i) => {
      const userRow = row?.user || {};
      const userId = userRow?._id;
      return (
        <tr key={userId || `row-${i}`}>
          <td>{i + 1}</td>
          <td>{userRow?.realname || userRow?.username || "-"}</td>
          <td>{getTeamName(userId)}</td>
          <td>{formatPointValue(row?.racePoints || 0)}</td>
          {includePredictions ? (
            <>
              <td>{formatPointValue(row?.predictionPoints || 0)}</td>
              <td>
                <strong>{formatPointValue(row?.combinedPoints || 0)}</strong>
              </td>
            </>
          ) : null}
        </tr>
      );
    });

  const resultRows = participants.map((p) => {
    let last = 0;
    const racePoints = cumulativeData.map((r) => {
      const val = r[p._id] ?? 0;
      const diff = val - last;
      last = val;
      return diff;
    });
    return (
      <tr key={p._id}>
        <td>{p.realname}</td>
        <td>{getTeamName(p._id)}</td>
        {racePoints.map((pts, idx) => (
          <td key={idx}>{pts}</td>
        ))}
        <td>
          <strong>{last}</strong>
        </td>
        {includePredictions ? (
          <>
            <td>
              {formatPointValue(
                combinedStandingsByUserId.get(String(p._id))
                  ?.predictionPoints || 0,
              )}
            </td>
            <td>
              <strong>
                {formatPointValue(
                  combinedStandingsByUserId.get(String(p._id))
                    ?.combinedPoints ?? last,
                )}
              </strong>
            </td>
          </>
        ) : null}
      </tr>
    );
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    if (!activePoint?.userId) {
      return (
        <div className="home-chart-tooltip">
          <p className="home-chart-tooltip-hint">
            Punkt anklicken, um Details zu sehen.
          </p>
        </div>
      );
    }

    const selectedEntry = payload.find(
      (entry) => entry.dataKey === activePoint.userId,
    );
    if (!selectedEntry) {
      return null;
    }

    return (
      <div className="home-chart-tooltip">
        <p className="home-chart-tooltip-label">Rennen: {label}</p>
        <p className="home-chart-tooltip-entry">
          <span
            className="home-chart-tooltip-dot"
            style={{ backgroundColor: selectedEntry.color }}
          />
          <strong>{selectedEntry.name}</strong>: {selectedEntry.value}
        </p>
        <p className="home-chart-tooltip-meta">
          Team: {getTeamName(activePoint.userId)}
        </p>
      </div>
    );
  };

  const renderClickableDot = (participant) => (props) => {
    const { cx, cy, payload, value, stroke } = props;
    if (typeof cx !== "number" || typeof cy !== "number" || value == null) {
      return null;
    }

    const raceName = payload?.name || "-";
    const points = Number(value);
    const isActive =
      activePoint?.userId === participant._id &&
      activePoint?.raceName === raceName;

    const handleSelect = (event) => {
      event?.stopPropagation?.();

      setActivePoint((previous) => {
        if (
          previous &&
          previous.userId === participant._id &&
          previous.raceName === raceName
        ) {
          return null;
        }

        return {
          userId: participant._id,
          userName: participant.realname,
          raceName,
          points: Number.isFinite(points) ? points : 0,
          color: stroke || "#ff1e1e",
        };
      });
    };

    return (
      <g className="home-chart-dot-group" onClick={handleSelect}>
        <circle className="home-chart-dot-hitbox" cx={cx} cy={cy} r={14} />
        {isActive ? (
          <circle
            className="home-chart-dot-active-ring"
            cx={cx}
            cy={cy}
            r={10}
            stroke={stroke || "#ff1e1e"}
          />
        ) : null}
        <circle
          className="home-chart-dot-visible"
          cx={cx}
          cy={cy}
          r={isActive ? 7 : 5.5}
          fill={stroke || "#ff1e1e"}
        />
      </g>
    );
  };

  const myTeam = localUser ? getTeamData(localUser._id) : null;
  const loggedInRealname =
    typeof localUser?.realname === "string" && localUser.realname.trim()
      ? localUser.realname.trim()
      : "Unbekannt";
  const isCurrentSeasonParticipant =
    !!season &&
    !!localUser &&
    (season.participants || []).some((participant) => {
      const participantId =
        typeof participant === "object" ? participant?._id : participant;
      return participantId === localUser._id;
    });
  const combinedMeta = combinedStandings?.meta || null;

  return (
    <div className="home-container">
      <h1>
        Willkommen zu
        <br />
        Marbula One
      </h1>
      {localUser && (
        <p className="home-logged-in-as">
          Angemeldet als: <strong>{loggedInRealname}</strong>
        </p>
      )}

      <div className="sections-grid">
        <section
          className={myTeam ? "home-team-section" : undefined}
          style={
            myTeam
              ? {
                  "--team-color": myTeam.color,
                  "--team-color-soft": getTeamColorSoft(myTeam.color),
                }
              : undefined
          }
        >
          <h2>Dein Team</h2>
          {season && localUser && myTeam ? (
            <div className="home-team-card">
              <div
                className="home-team-logo-wrap"
                aria-hidden={!myTeam.logoUrl}
              >
                {myTeam.logoUrl ? (
                  <img
                    src={myTeam.logoUrl}
                    alt={`${myTeam.name} Logo`}
                    className="home-team-logo"
                  />
                ) : (
                  <span className="home-team-logo-fallback">
                    {myTeam.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <p className="home-team-name">{myTeam.name}</p>
            </div>
          ) : isCurrentSeasonParticipant ? (
            <Link to="/choose-team">Team wählen</Link>
          ) : (
            <p>Du bist in dieser Season nicht als Teilnehmer hinterlegt.</p>
          )}
        </section>

        <section>
          <h2>Aktuelle Saison</h2>
          {season ? (
            <>
              <p>{season.name}</p>
              <p>
                Event-Datum: {new Date(season.eventDate).toLocaleDateString()}
              </p>
            </>
          ) : (
            <p>Keine Saison gefunden</p>
          )}
        </section>
      </div>

      <section>
        <h2>
          {includePredictions ? "Rangliste (Gesamt)" : "Rangliste (nur Rennen)"}
        </h2>
        {includePredictions &&
        (combinedMeta?.reviewRequiredPublishedPredictionRounds ||
          includedPredictionRounds.length > 0) ? (
          <div className="home-combined-meta">
            {combinedMeta?.reviewRequiredPublishedPredictionRounds ? (
              <p className="home-combined-warning">
                Review offen bei{" "}
                {combinedMeta.reviewRequiredPublishedPredictionRounds}{" "}
                Prediction-Runde(n).
              </p>
            ) : null}
            {includedPredictionRounds.length > 0 ? (
              <>
                <p className="home-combined-muted">Berechnete Tippspiele:</p>
                <div className="home-prediction-round-chip-list">
                  {includedPredictionRounds.map((round) => (
                    <span
                      key={round._id}
                      className={`home-prediction-round-chip ${
                        round.requiresReview ? "is-warning" : ""
                      }`}
                    >
                      {round?.race?.name || "Prediction-Runde"}
                    </span>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
        {rankingRows.length > 0 ? (
          renderTable(rankingRows, rankingTableColumns)
        ) : (
          <p>Keine Rangliste verfügbar</p>
        )}
      </section>

      <section>
        <h2>Ergebnisse</h2>
        {resultRows.length > 0 ? (
          renderTable(resultRows, [
            "Name",
            "Team",
            ...cumulativeData.map((r) => r.name),
            "Rennen Total",
            ...(includePredictions ? ["Predictions", "Gesamt"] : []),
          ])
        ) : (
          <p>Keine Resultate verfügbar</p>
        )}
      </section>

      <section>
        <h2>Punkteverlauf</h2>
        <div className="home-chart-filter-row">
          <details className="home-chart-filter-dropdown">
            <summary>
              <span>
                User filtern ({visibleParticipants.length}/{participants.length}
                )
              </span>
              <FontAwesomeIcon
                icon={faChevronDown}
                className="home-chart-filter-icon"
              />
            </summary>
            <div className="home-chart-filter-content">
              <div className="home-chart-filter-actions">
                <button
                  type="button"
                  className="home-chart-filter-action"
                  onClick={() =>
                    setVisibleUserIds(
                      participants.map((participant) => participant._id),
                    )
                  }
                >
                  Alle anzeigen
                </button>
                <button
                  type="button"
                  className="home-chart-filter-action"
                  onClick={() => setVisibleUserIds([])}
                >
                  Alle ausblenden
                </button>
              </div>

              <div className="home-chart-filter-list">
                {participants.map((participant) => (
                  <label
                    key={participant._id}
                    className="home-chart-filter-item"
                  >
                    <input
                      type="checkbox"
                      checked={visibleUserIds.includes(participant._id)}
                      onChange={() => toggleVisibleUser(participant._id)}
                    />
                    <span>{participant.realname}</span>
                  </label>
                ))}
              </div>
            </div>
          </details>
        </div>
        <div className="scroll-wrapper chart-scroll-wrapper">
          <div className="chart-inner">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayedChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {visibleParticipants.map((p, i) => (
                  <Line
                    key={p._id}
                    type="monotone"
                    dataKey={p._id}
                    name={p.realname}
                    stroke={generateColor(
                      i,
                      Math.max(visibleParticipants.length, 1),
                    )}
                    strokeWidth={2}
                    dot={renderClickableDot(p)}
                    activeDot={{ r: 0 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        {visibleParticipants.length === 0 ? (
          <p className="home-chart-filter-empty">
            Keine User ausgewählt. Bitte mindestens einen User aktivieren.
          </p>
        ) : null}
      </section>

      <div
        className="home-global-predictions-toggle"
        role="group"
        aria-label="Predictions Darstellung"
      >
        <label className="home-switch">
          <input
            type="checkbox"
            checked={includePredictions}
            onChange={(event) => setIncludePredictions(event.target.checked)}
          />
          <span className="home-switch-label">Tippspiele</span>
          <span className="home-switch-track" aria-hidden="true">
            <span className="home-switch-thumb" />
          </span>
        </label>
      </div>
    </div>
  );
}
