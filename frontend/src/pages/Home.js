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
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-8 overflow-hidden">
      <h2 className="text-2xl font-bold mb-4">Willkommen zurück</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <section className="bg-brand-light p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-2">Dein Team</h3>
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

        <section className="bg-brand-light p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-2">Aktuelle Saison</h3>
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
      </div>

      <section className="bg-brand-light p-6 rounded shadow">
        <h3 className="text-xl font-semibold mb-4">Aktuelle Rangliste</h3>
        {participants.length > 0 && cumulativeData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[480px] w-full text-sm">
              <thead className="sticky top-0 bg-brand-light z-10">
                <tr className="text-gray-400">
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
          </div>
        ) : (
          <p className="text-gray-400">Keine Rangliste verfügbar</p>
        )}
      </section>

      <section className="bg-brand-light p-6 rounded shadow">
        <h3 className="text-xl font-semibold mb-4">Ergebnis-Tabelle</h3>
        {season && participants.length > 0 && cumulativeData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-brand-light z-10">
                <tr>
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
          </div>
        ) : (
          <p className="text-gray-400">Keine Resultate verfügbar</p>
        )}
      </section>

      <section className="bg-brand-light p-6 rounded shadow">
        <h3 className="text-xl font-semibold mb-4">Punkteverlauf</h3>
        {cumulativeData.length > 0 ? (
          <div className="overflow-x-auto">
            <div className="min-w-[640px] h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={cumulativeData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip wrapperStyle={{ fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
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
        ) : (
          <p className="text-gray-400">Keine Daten verfügbar</p>
        )}
      </section>
    </main>
  );
}
