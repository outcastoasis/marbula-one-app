import { useState, useEffect } from "react";
import API from "../../api";
import { Link } from "react-router-dom";

export default function AdminSeasons() {
  const [seasons, setSeasons] = useState([]);
  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [participants, setParticipants] = useState([]);
  const [users, setUsers] = useState([]);

  const fetchSeasons = async () => {
    const res = await API.get("/seasons");
    setSeasons(res.data);
  };

  const addSeason = async () => {
    if (!name || !eventDate) return;
    await API.post("/seasons", { name, eventDate, participants });
    setName("");
    setEventDate("");
    setParticipants([]);
    fetchSeasons();
  };

  const deleteSeason = async (id) => {
    await API.delete(`/seasons/${id}`);
    fetchSeasons();
  };

  useEffect(() => {
    fetchSeasons();
    API.get("/users").then((res) => setUsers(res.data));
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Seasons verwalten</h2>

      <div className="bg-brand-light p-6 rounded-lg shadow space-y-4 mb-10">
        <div>
          <label className="block text-sm mb-1">Season Name</label>
          <input
            placeholder="z. B. Season 5"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 bg-brand-dark border border-brand-border text-brand-text rounded focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Event-Datum</label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full px-4 py-2 bg-brand-dark border border-brand-border text-brand-text rounded focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Teilnehmende Benutzer:</label>
          <select
            multiple
            value={participants}
            onChange={(e) =>
              setParticipants(Array.from(e.target.selectedOptions, (o) => o.value))
            }
            className="w-full h-32 bg-brand-dark border border-brand-border text-brand-text rounded p-2 focus:outline-none focus:ring-2 focus:ring-brand"
          >
            {users.map((u) => (
              <option key={u._id} value={u._id}>
                {u.username} ({u.email})
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={addSeason}
          className="bg-brand text-white font-semibold py-2 px-4 rounded hover:bg-red-600 transition"
        >
          Season hinzufügen
        </button>
      </div>

      <div className="space-y-4">
        {seasons.map((s) => (
          <div
            key={s._id}
            className="bg-brand-light p-4 rounded-lg shadow flex justify-between items-center"
          >
            <div>
              <h3 className="font-semibold">{s.name}</h3>
              <p className="text-sm text-gray-400">
                {new Date(s.eventDate).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-4 items-center">
              <Link
                to={`/admin/seasons/${s._id}/races`}
                className="text-brand hover:underline"
              >
                → Rennen verwalten
              </Link>
              <button
                onClick={() => {
                  if (window.confirm(`Season "${s.name}" wirklich löschen?`)) {
                    deleteSeason(s._id);
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
