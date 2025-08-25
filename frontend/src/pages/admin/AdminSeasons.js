import { useState, useEffect } from "react";
import API from "../../api";

export default function AdminSeasons() {
  const [seasons, setSeasons] = useState([]);
  const [year, setYear] = useState("");
  const [eventDate, setEventDate] = useState("");

  const fetchSeasons = async () => {
    const res = await API.get("/seasons");
    setSeasons(res.data);
  };

  const addSeason = async () => {
    if (!year || !eventDate) return;
    await API.post("/seasons", { year, eventDate });
    setYear("");
    setEventDate("");
    fetchSeasons();
  };

  const deleteSeason = async (id) => {
    await API.delete(`/seasons/${id}`);
    fetchSeasons();
  };

  useEffect(() => {
    fetchSeasons();
  }, []);

  return (
    <div>
      <h2>Seasons verwalten</h2>

      <input
        type="number"
        placeholder="Season Jahr (z. B. 2024)"
        value={year}
        onChange={(e) => setYear(e.target.value)}
      />
      <input
        type="date"
        value={eventDate}
        onChange={(e) => setEventDate(e.target.value)}
      />
      <button onClick={addSeason}>Season hinzufügen</button>

      <ul>
        {seasons.map((s) => (
          <li key={s._id}>
            Season {s.year} – {new Date(s.eventDate).toLocaleDateString()}
            <button onClick={() => deleteSeason(s._id)}>🗑️</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
