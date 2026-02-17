import { useContext, useEffect, useState } from "react";
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
          return;
        }

        const filtered = (seasonRes.data.participants || []).filter(
          (participant) => typeof participant === "object" && participant?._id,
        );
        setParticipants(filtered);
        setVisibleUserIds(filtered.map((participant) => participant._id));

        const [assignmentRes, racesRes] = await Promise.all([
          API.get(`/userSeasonTeams?season=${seasonId}`),
          API.get(`/races/season/${seasonId}`),
        ]);

        setAssignments(assignmentRes.data);

        const races = racesRes.data;

        const cumulative = {};
        filtered.forEach((u) => (cumulative[u._id] = 0));

        const chartData = races.map((race) => {
          const entry = { name: race.name };
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

  const visibleParticipants = participants.filter((participant) =>
    visibleUserIds.includes(participant._id),
  );

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

  const rankingRows = [...participants]
    .map((p) => ({
      ...p,
      points: cumulativeData.at(-1)?.[p._id] || 0,
    }))
    .sort((a, b) => b.points - a.points)
    .map((p, i) => (
      <tr key={p._id}>
        <td>{i + 1}</td>
        <td>{p.realname}</td>
        <td>{getTeamName(p._id)}</td>
        <td>{p.points}</td>
      </tr>
    ));

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
        <h2>Rangliste</h2>
        {rankingRows.length > 0 ? (
          renderTable(rankingRows, ["#", "Name", "Team", "Punkte"])
        ) : (
          <p>Keine Rangliste verfügbar</p>
        )}
      </section>

      <section>
        <h2>Ergebnis-Tabelle</h2>
        {resultRows.length > 0 ? (
          renderTable(resultRows, [
            "Name",
            "Team",
            ...cumulativeData.map((r) => r.name),
            "Total",
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
              <LineChart data={cumulativeData}>
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
    </div>
  );
}
