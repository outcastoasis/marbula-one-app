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
import styles from "./Home.module.css";

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
    <main className={styles.container}>
      <h2 className={styles.heading}>Willkommen zurück</h2>

      <div className={styles.grid}>
        <section className={styles.section}>
          <h3 className={styles.subheading}>Dein Team</h3>
          {user?.selectedTeam ? (
            <p className={styles.text}>{user.selectedTeam.name}</p>
          ) : (
            <Link to="/choose-team" className={styles.button}>
              Team wählen
            </Link>
          )}
        </section>

        <section className={styles.section}>
          <h3 className={styles.subheading}>Aktuelle Saison</h3>
          {season ? (
            <>
              <p className={styles.text}>{season.name}</p>
              <p className={styles.date}>
                Event-Datum: {new Date(season.eventDate).toLocaleDateString()}
              </p>
            </>
          ) : (
            <p className={styles.date}>Keine Saison gefunden</p>
          )}
        </section>
      </div>

      <section className={styles.section}>
        <h3 className={styles.subheading}>Aktuelle Rangliste</h3>
        {participants.length > 0 && cumulativeData.length > 0 ? (
          <div className={styles.scroll}>
            <table className={styles.table}>
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
          <p className={styles.date}>Keine Rangliste verfügbar</p>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.subheading}>Ergebnis-Tabelle</h3>
        {season && participants.length > 0 && cumulativeData.length > 0 ? (
          <div className={styles.scroll}>
            <table className={styles.table}>
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
                      <td>{last}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.date}>Keine Resultate verfügbar</p>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.subheading}>Punkteverlauf</h3>
        {cumulativeData.length > 0 ? (
          <div className={styles.chartWrapper}>
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
          <p className={styles.date}>Keine Daten verfügbar</p>
        )}
      </section>
    </main>
  );
}
