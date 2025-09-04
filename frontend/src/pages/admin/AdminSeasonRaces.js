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

  if (!season) return <p className="text-brand-text">⏳ Lade Season...</p>;

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-2">Rennen verwalten – Season {season.name}</h2>
      <p className="text-sm text-gray-400 mb-6">
        Event-Datum: {new Date(season.eventDate).toLocaleDateString()}
      </p>

      <div className="bg-brand-light p-6 rounded-lg shadow space-y-4 mb-10">
        <div>
          <label className="block text-sm mb-1">Name des Rennens</label>
          <input
            placeholder="z. B. Midnight Bay Circuit"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 bg-brand-dark border border-brand-border text-brand-text rounded focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <button
          onClick={addRace}
          className="bg-brand text-white font-semibold py-2 px-4 rounded hover:bg-red-600 transition"
        >
          Rennen hinzufügen
        </button>
      </div>

      <div className="space-y-4">
        {races.map((r) => (
          <div
            key={r._id}
            className="bg-brand-light p-4 rounded-lg shadow flex justify-between items-center"
          >
            <span className="font-medium text-brand-text">{r.name}</span>
            <div className="flex gap-4 items-center">
              <a
                href={`/admin/races/${r._id}/results`}
                className="text-brand hover:underline text-sm"
              >
                → Ergebnisse
              </a>
              <button
                onClick={() => {
                  if (window.confirm(`Rennen "${r.name}" wirklich löschen?`)) {
                    deleteRace(r._id);
                  }
                }}
                className="text-red-500 hover:text-red-700"
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