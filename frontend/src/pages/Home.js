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

        if (userChanged) {
          login(userRes.data);
        }

        const res = await API.get("/seasons/current");
        const currentSeason = res.data;

        setSeason(currentSeason);

        const usersRes = await API.get("/users");
        const users = usersRes.data.filter((u) =>
          currentSeason.participants.includes(u._id)
        );
        setParticipants(users);
        console.log("Teilnehmer:", users);

        const racesRes = await API.get(`/races/season/${currentSeason._id}`);
        const races = racesRes.data;

        console.log("Lade Rennen mit Resultaten:", races);

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
        // Optional: Fehleranzeige im UI setzen
      }
    };
    console.log("🎯 Aktuelle Season:", currentSeason);
    console.log("👥 Teilnehmer (participants):", users);
    console.log("🏁 Rennen mit Resultaten:", races);
    fetchData();
  }, [user]);

  const generateColor = (index, total) => {
    const hue = (index * (360 / total)) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <h2 className="text-2xl font-bold mb-2">Willkommen zurück</h2>

      <section className="bg-brand-light p-6 rounded shadow">
        <h3 className="text-xl font-semibold mb-2">Dein Team</h3>
        {user?.selectedTeam ? (
          <p className="text-brand-text">{user.selectedTeam.name}</p>
        ) : (
          <Link
            to="/choose-team"
            className="inline-block mt-2 bg-brand text-white font-semibold py-2 px-4 rounded hover:bg-red-600 transition"
          >
            Team wählen
          </Link>
        )}
      </section>

      <section className="bg-brand-light p-6 rounded shadow">
        <h3 className="text-xl font-semibold mb-2">Aktuelle Saison</h3>
        {season ? (
          <>
            <p className="mb-1 text-brand-text font-medium">{season.name}</p>
            <p className="text-sm text-gray-400">
              Event-Datum: {new Date(season.eventDate).toLocaleDateString()}
            </p>
          </>
        ) : (
          <p className="text-gray-400">Keine Saison gefunden</p>
        )}
      </section>

      <section className="bg-brand-light p-6 rounded shadow">
        <h3 className="text-xl font-semibold mb-4">Aktuelle Rangliste</h3>
        {participants.length > 0 && cumulativeData.length > 0 ? (
          <table className="w-full table-auto text-left">
            <thead>
              <tr className="text-sm text-gray-400">
                <th className="py-2">#</th>
                <th className="py-2">Name</th>
                <th className="py-2">Team</th>
                <th className="py-2">Punkte</th>
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
                  <tr key={p._id} className="border-t border-brand-border">
                    <td className="py-2">{index + 1}</td>
                    <td className="py-2">{p.username}</td>
                    <td className="py-2">{p.team}</td>
                    <td className="py-2">{p.points}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-400">Keine Rangliste verfügbar</p>
        )}
      </section>

      <section className="bg-brand-light p-6 rounded shadow overflow-x-auto">
        <h3 className="text-xl font-semibold mb-4">Ergebnis-Tabelle</h3>

        {season && participants.length > 0 && cumulativeData.length > 0 ? (
          <table className="min-w-[640px] w-full table-auto border-collapse text-sm">
            <thead>
              <tr className="w-full table-auto text-left">
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Team</th>
                {cumulativeData.map((race, idx) => (
                  <th key={idx} className="p-2 text-center">
                    {race.name}
                  </th>
                ))}
                <th className="p-2 text-center">Total</th>
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
                  <tr key={p._id} className="hover:bg-brand-dark">
                    <td className="p-2 border-t border-brand-border">
                      {p.username}
                    </td>
                    <td className="p-2 border-t border-brand-border">
                      {p.selectedTeam?.name || "-"}
                    </td>
                    {racePoints.map((pts, idx) => (
                      <td
                        key={idx}
                        className="p-2 border-t border-brand-border text-center"
                      >
                        {pts}
                      </td>
                    ))}
                    <td className="p-2 border-t border-brand-border font-bold text-center">
                      {last}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-400">Keine Resultate verfügbar</p>
        )}
      </section>

      <section className="bg-brand-light p-6 rounded shadow">
        <h3 className="text-xl font-semibold mb-4">Punkteverlauf</h3>
        {cumulativeData.length > 0 ? (
          <div className="w-full h-96">
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
          <p className="text-gray-400">Keine Daten verfügbar</p>
        )}
      </section>

      {/* TODO: Weitere Sektionen wie Rangliste, Renntabellen etc. */}
    </div>
  );
}
