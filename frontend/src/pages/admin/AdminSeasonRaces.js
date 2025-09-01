import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../../api";

export default function AdminSeasonRaces() {
  const { seasonId } = useParams();
  const [season, setSeason] = useState(null);
  const [races, setRaces] = useState([]);
  const [name, setName] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const seasonRes = await API.get(`/seasons`);
      const found = seasonRes.data.find((s) => s._id === seasonId);
      setSeason(found);

      const raceRes = await API.get(`/races/season/${seasonId}`);
      setRaces(raceRes.data);
    };
    fetchData();
  }, [seasonId]);

  const addRace = async () => {
    if (!name) return;
    await API.post(`/races/season/${seasonId}`, { name });
    setName("");
    const updated = await API.get(`/races/season/${seasonId}`);
    setRaces(updated.data);
  };

  const deleteRace = async (id) => {
    await API.delete(`/races/${id}`);
    const updated = await API.get(`/races/season/${seasonId}`);
    setRaces(updated.data);
  };

  if (!season) return <p>⏳ Lade Season...</p>;

  return (
    <div>
      <h2>Rennen verwalten – Season {season.year}</h2>
      <p>Event-Datum: {new Date(season.eventDate).toLocaleDateString()}</p>

      <input
        placeholder="Name des Rennens"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button onClick={addRace}>Rennen hinzufügen</button>

      <ul>
        {races.map((r) => (
          <li key={r._id}>
            {r.name}
            <button
              onClick={() => {
                if (window.confirm(`Rennen "${r.name}" wirklich löschen?`)) {
                  deleteRace(r._id);
                }
              }}
            >
              🗑️
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
