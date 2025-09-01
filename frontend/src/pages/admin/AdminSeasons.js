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
    <div>
      <h2>Seasons verwalten</h2>

      <input
        placeholder="Season Name (z. B. Season 5)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="date"
        value={eventDate}
        onChange={(e) => setEventDate(e.target.value)}
      />

      <label>Teilnehmende Benutzer auswählen:</label>
      <select
        multiple
        value={participants}
        onChange={(e) =>
          setParticipants(Array.from(e.target.selectedOptions, (o) => o.value))
        }
      >
        {users.map((u) => (
          <option key={u._id} value={u._id}>
            {u.username} ({u.email})
          </option>
        ))}
      </select>

      <button onClick={addSeason}>Season hinzufügen</button>

      <ul>
        {seasons.map((s) => (
          <li key={s._id}>
            {s.name} – {new Date(s.eventDate).toLocaleDateString()}{" "}
            <Link to={`/admin/seasons/${s._id}/races`}>→ Rennen verwalten</Link>{" "}
            <button
              onClick={() => {
                if (window.confirm(`Season "${s.name}" wirklich löschen?`)) {
                  deleteSeason(s._id);
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
