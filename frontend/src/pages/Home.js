// === Home.js ===

import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import API from "../api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Link } from "react-router-dom";
import "../index.css";

export default function Home() {
  const { user, login } = useContext(AuthContext);
  const [season, setSeason] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [cumulativeData, setCumulativeData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await API.get("/users/me");
        const userChanged =
          !user ||
          user._id !== userRes.data._id ||
          (user.selectedTeam?._id || "") !==
            (userRes.data.selectedTeam?._id || "");

        if (userChanged) login(userRes.data);

        const res = await API.get("/seasons/current");
        const currentSeason = res.data;
        setSeason(currentSeason);

        const usersRes = await API.get("/users");
        const users = usersRes.data.filter((u) =>
          currentSeason.participants.some((p) => {
            const pid = typeof p === "object" ? p._id : p;
            return pid === u._id;
          })
        );
        setParticipants(users);

        const racesRes = await API.get(`/races/season/${currentSeason._id}`);
        const races = racesRes.data;

        const cumulativePoints = {};
        users.forEach((u) => (cumulativePoints[u._id] = 0));

        const chartData = races.map((race) => {
          const entry = { name: race.name };
          race.results.forEach((r) => {
            const userId = typeof r.user === "object" ? r.user._id : r.user;
            if (userId && userId in cumulativePoints) {
              cumulativePoints[userId] += r.pointsEarned || 0;
            }
          });
          users.forEach((u) => {
            entry[u.username] = cumulativePoints[u._id];
          });
          return entry;
        });

        setCumulativeData(chartData);
      } catch (error) {
        console.error("Fehler beim Laden der Daten in Home.js:", error);
      }
    };
    fetchData();
  }, [user]);

  const generateColor = (index, total) => {
    const hue = (index * (360 / total)) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  };

  return (
    <div>
      <h1>Willkommen zur Marbula One Saison</h1>

      <div>
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
      </div>

      <section>
        <h2>Rangliste</h2>
        {participants.length > 0 && cumulativeData.length > 0 ? (
          <div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Team</th>
                  <th>Punkte</th>
                </tr>
              </thead>
              <tbody>
                {[...participants]
                  .map((p) => ({
                    _id: p._id,
                    username: p.username,
                    team: p.selectedTeam?.name || "–",
                    points:
                      cumulativeData[cumulativeData.length - 1]?.[p.username] ||
                      0,
                  }))
                  .sort((a, b) => b.points - a.points)
                  .map((p, index) => (
                    <tr key={p._id}>
                      <td>{index + 1}</td>
                      <td>{p.username}</td>
                      <td>{p.team}</td>
                      <td>{p.points}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>Keine Rangliste verfügbar</p>
        )}
      </section>

      <section>
        <h2>Ergebnis-Tabelle</h2>
        {season && participants.length > 0 && cumulativeData.length > 0 ? (
          <div>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Team</th>
                  {cumulativeData.map((race, idx) => (
                    <th key={idx}>{race.name}</th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => {
                  let last = 0;
                  const racePoints = cumulativeData.map((race) => {
                    const current = race[p.username] ?? 0;
                    const earned = current - last;
                    last = current;
                    return earned;
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
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p>Keine Resultate verfügbar</p>
        )}
      </section>

      <section>
        <h2>Punkteverlauf</h2>
        <div className="chart-scroll">
          {cumulativeData.length > 0 ? (
            <div className="chart-inner">
              <ResponsiveContainer width="100%" height="100%">
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
          ) : (
            <p>Keine Daten verfügbar</p>
          )}
        </div>
      </section>
    </div>
  );
}
