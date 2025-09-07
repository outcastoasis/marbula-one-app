import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../../api";
import "../../styles/AdminSeasonRaces.css";

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

  if (!season) return <p className="loading-text">⏳ Lade Season...</p>;

  return (
    <div className="admin-races-container">
      <h2>Rennen verwalten – Season {season.name}</h2>
      <p className="event-date">
        Event-Datum: {new Date(season.eventDate).toLocaleDateString()}
      </p>

      <div className="race-form">
        <div>
          <label>Name des Rennens</label>
          <input
            placeholder="z. B. Midnight Bay Circuit"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <button onClick={addRace}>Rennen hinzufügen</button>
      </div>

      <div className="race-list">
        {races.map((r) => (
          <div key={r._id} className="race-item">
            <span>{r.name}</span>
            <div className="race-actions">
              <a href={`/admin/races/${r._id}/results`}>→ Ergebnisse</a>
              <button
                onClick={() => {
                  if (window.confirm(`Rennen "${r.name}" wirklich löschen?`)) {
                    deleteRace(r._id);
                  }
                }}
                className="delete-btn"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
