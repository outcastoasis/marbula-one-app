import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import API from "../api";
import { Link } from "react-router-dom";
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
  const [assignments, setAssignments] = useState([]);
  const [cumulativeData, setCumulativeData] = useState([]);
  const [hoveredUserId, setHoveredUserId] = useState(null);

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
          (participant) => typeof participant === "object" && participant?._id
        );
        setParticipants(filtered);

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
      typeof assignment.team === "object" ? assignment.team._id : assignment.team;

    const seasonTeam =
      (season?.teams || []).find((team) => team?._id === assignedTeamId) || null;

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
    if (!active || !payload || payload.length === 0) return null;
    const current = payload.find((p) => p.dataKey === hoveredUserId);
    if (!current) return null;
    const { name, value, stroke } = current;

    return (
      <div
        style={{
          backgroundColor: "#1a1a1a",
          padding: "0.75rem 1rem",
          borderRadius: "10px",
          color: "#fff",
          border: `1px solid ${stroke}`,
          fontSize: "0.9rem",
        }}
      >
        <strong>{name}</strong>: {value} Punkte
        <br />
        <span style={{ color: "#ccc" }}>Rennen: {label}</span>
      </div>
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
              <div className="home-team-logo-wrap" aria-hidden={!myTeam.logoUrl}>
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
        <div className="scroll-wrapper chart-scroll-wrapper">
          <div className="chart-inner">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {participants.map((p, i) => (
                  <Line
                    key={p._id}
                    type="monotone"
                    dataKey={p._id}
                    name={p.realname}
                    stroke={generateColor(i, participants.length)}
                    strokeWidth={2}
                    dot={{ r: 6 }}
                    activeDot={{
                      r: 8,
                      onMouseOver: () => setHoveredUserId(p._id),
                      onMouseOut: () => setHoveredUserId(null),
                    }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
