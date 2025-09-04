import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../../api";

export default function AdminRaceResults() {
  const { raceId } = useParams();
  const [race, setRace] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [points, setPoints] = useState({});

  useEffect(() => {
    const loadData = async () => {
      const raceRes = await API.get(`/races/${raceId}`);
      setRace(raceRes.data);

      const seasonRes = await API.get(`/seasons`);
      const season = seasonRes.data.find((s) => s._id === raceRes.data.season);
      const users = season.participants;

      const usersRes = await API.get(`/users`);
      const filteredUsers = usersRes.data.filter((u) => users.includes(u._id));

      setParticipants(filteredUsers);

      const existing = {};
      raceRes.data.results.forEach((r) => {
        const userId = typeof r.user === "string" ? r.user : r.user._id;
        existing[userId] = r.pointsEarned;
      });
      setPoints(existing);
    };

    loadData();
  }, [raceId]);

  const handleChange = (userId, value) => {
    setPoints({ ...points, [userId]: Number(value) });
  };

  const saveResults = async () => {
    const results = participants.map((u) => ({
      user: u._id,
      pointsEarned: points[u._id] || 0,
    }));

    await API.put(`/races/${raceId}/results`, { results });
    alert("Ergebnisse gespeichert");
  };

  if (!race || participants.length === 0)
    return <p className="text-brand-text">⏳ Lade Daten...</p>;

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-2">Punktevergabe – {race.name}</h2>
      <p className="text-sm text-gray-400 mb-6">
        Resultate erfassen für alle Teilnehmenden
      </p>

      <div className="bg-brand-light p-6 rounded-lg shadow space-y-4 mb-10">
        {participants.map((user) => (
          <div key={user._id} className="flex items-center gap-4">
            <span className="w-32 text-brand-text">{user.username}</span>
            <input
              type="number"
              value={points[user._id] || 0}
              onChange={(e) => handleChange(user._id, e.target.value)}
              min="0"
              className="w-24 px-3 py-2 bg-brand-dark border border-brand-border text-brand-text rounded focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        ))}
      </div>

      <button
        onClick={saveResults}
        className="bg-brand text-white font-semibold py-2 px-4 rounded hover:bg-red-600 transition"
      >
        Ergebnisse speichern
      </button>
    </div>
  );
}
