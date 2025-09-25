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
  const [hoveredLine, setHoveredLine] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await API.get("/users/me");
        if (!user || user._id !== userRes.data._id) {
          login(userRes.data);
        }
        setLocalUser(userRes.data);

        const seasonRes = await API.get("/seasons/current");
        setSeason(seasonRes.data);

        const usersRes = await API.get("/users");
        const filtered = usersRes.data.filter((u) =>
          seasonRes.data.participants.some((p) =>
            typeof p === "object" ? p._id === u._id : p === u._id
          )
        );
        setParticipants(filtered);

        const assignmentRes = await API.get(
          `/userSeasonTeams?season=${seasonRes.data._id}`
        );
        setAssignments(assignmentRes.data);

        const racesRes = await API.get(`/races/season/${seasonRes.data._id}`);
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
            entry[u.realname] = cumulative[u._id];
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

  const getTeamName = (userId) => {
    const entry = assignments.find(
      (a) =>
        a.user._id === userId &&
        (typeof a.season === "object"
          ? a.season._id === season?._id
          : a.season === season?._id)
    );
    return entry?.team?.name || "-";
  };

  const generateColor = (index, total) =>
    `hsl(${(index * 360) / total}, 70%, 50%)`;

  const renderTable = (rows, columns) => (
    <div className="scroll-wrapper">
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
      points: cumulativeData.at(-1)?.[p.realname] || 0,
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
      const val = r[p.realname] ?? 0;
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
    const current = payload.find((p) => p.name === hoveredLine);
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

  return (
    <div className="home-container">
      <h1>
        Willkommen zu
        <br />
        Marbula One
      </h1>

      <div className="sections-grid">
        <section>
          <h2>Dein Team</h2>
          {season && localUser ? (
            <p>{getTeamName(localUser._id)}</p>
          ) : (
            <Link to="/choose-team">Team wählen</Link>
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
        <div className="scroll-wrapper">
          <div className="chart-inner">
            <ResponsiveContainer width="100%" height={600}>
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
                    dataKey={p.realname}
                    stroke={generateColor(i, participants.length)}
                    strokeWidth={2}
                    dot={{ r: 6 }}
                    activeDot={{
                      r: 8,
                      onMouseOver: () => setHoveredLine(p.realname),
                      onMouseOut: () => setHoveredLine(null),
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
