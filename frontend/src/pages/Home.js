// src/pages/Home.js
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
import "../index.css";
//test

export default function Home() {
  const { user, login } = useContext(AuthContext);
  const [season, setSeason] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [cumulativeData, setCumulativeData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await API.get("/users/me");
        if (!user || user._id !== userRes.data._id) {
          login(userRes.data);
        }

        const seasonRes = await API.get("/seasons/current");
        setSeason(seasonRes.data);

        const usersRes = await API.get("/users");
        const filtered = usersRes.data.filter((u) =>
          seasonRes.data.participants.some((p) =>
            typeof p === "object" ? p._id === u._id : p === u._id
          )
        );
        setParticipants(filtered);

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
            entry[u.username] = cumulative[u._id];
          });
          return entry;
        });

        setCumulativeData(chartData);
      } catch (error) {
        console.error("Fehler beim Laden:", error);
      }
    };

    fetchData();
  }, [user]);

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
      points: cumulativeData.at(-1)?.[p.username] || 0,
    }))
    .sort((a, b) => b.points - a.points)
    .map((p, i) => (
      <tr key={p._id}>
        <td>{i + 1}</td>
        <td>{p.username}</td>
        <td>{p.selectedTeam?.name || "-"}</td>
        <td>{p.points}</td>
      </tr>
    ));

  const resultRows = participants.map((p) => {
    let last = 0;
    const racePoints = cumulativeData.map((r) => {
      const val = r[p.username] ?? 0;
      const diff = val - last;
      last = val;
      return diff;
    });
    return (
      <tr key={p._id}>
        <td>{p.username}</td>
        <td>{p.selectedTeam?.name || "-"}</td>
        {racePoints.map((pts, idx) => (
          <td key={idx}>{pts}</td>
        ))}
        <td>
          <strong>{last}</strong>
        </td>
      </tr>
    );
  });

  return (
    <div className="home-container">
      <h1>Willkommen zur Marbula One Saison</h1>

      <section>
        <h2>Dein Team</h2>
        {user?.selectedTeam ? (
          <p>{user.selectedTeam.name}</p>
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
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                {participants.map((p, i) => (
                  <Line
                    key={p._id}
                    type="monotone"
                    dataKey={p.username}
                    stroke={generateColor(i, participants.length)}
                    strokeWidth={2}
                    dot={{ r: 3 }}
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
