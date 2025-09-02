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

      // Punkte vorfüllen
      const existing = {};
      raceRes.data.results.forEach((r) => {
        existing[r.user._id] = r.pointsEarned;
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

  if (!race || participants.length === 0) return <p>⏳ Lade Daten...</p>;

  return (
    <div>
      <h2>Punktevergabe – {race.name}</h2>

      {participants.map((user) => (
        <div key={user._id}>
          {user.username}:{" "}
          <input
            type="number"
            value={points[user._id] || 0}
            onChange={(e) => handleChange(user._id, e.target.value)}
            min="0"
          />
        </div>
      ))}

      <button onClick={saveResults}>Speichern</button>
    </div>
  );
}
