import { useState, useEffect } from "react";
import API from "../../api";
import "../../styles/AdminWin.css";

export default function AdminWin() {
  const [formData, setFormData] = useState({
    date: "",
    location: "",
    winnerUser: "",
    winnerTeam: "",
    lastPlaceUser: "",
    lastPlaceTeam: "",
    nextOrganizer: "",
    notes: "",
  });

  const [winners, setWinners] = useState([]);

  useEffect(() => {
    const fetchWinners = async () => {
      try {
        const res = await API.get("/winners");
        setWinners(res.data);
      } catch (err) {
        console.error("Fehler beim Laden der Gewinner:", err);
      }
    };
    fetchWinners();
  }, []);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post("/winners", formData);
      alert("Erfolgreich eingetragen!");
      setFormData({
        date: "",
        location: "",
        winnerUser: "",
        winnerTeam: "",
        lastPlaceUser: "",
        lastPlaceTeam: "",
        nextOrganizer: "",
        notes: "",
      });

      const res = await API.get("/winners");
      setWinners(res.data);
    } catch (err) {
      console.error(err);
      alert("Fehler beim Eintragen.");
    }
  };

  return (
    <div className="admin-win-container">
      <h2>Event-Sieger eintragen</h2>

      <form onSubmit={handleSubmit} className="admin-win-form">
        <input
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="location"
          placeholder="Ort"
          value={formData.location}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="winnerUser"
          placeholder="Gewinner (Name)"
          value={formData.winnerUser}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="winnerTeam"
          placeholder="Gewinner-Team"
          value={formData.winnerTeam}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="lastPlaceUser"
          placeholder="Letzter Platz (Name)"
          value={formData.lastPlaceUser}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="lastPlaceTeam"
          placeholder="Letzter Platz-Team"
          value={formData.lastPlaceTeam}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="nextOrganizer"
          placeholder="Organisator nächstes Jahr"
          value={formData.nextOrganizer}
          onChange={handleChange}
          required
        />
        <textarea
          name="notes"
          placeholder="Notizen (optional)"
          value={formData.notes}
          onChange={handleChange}
        ></textarea>
        <button type="submit">Speichern</button>
      </form>

      <h2>Vergangene Events</h2>
      <div className="table-wrapper">
        <table className="admin-win-table">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Ort</th>
              <th>Gewinner</th>
              <th>Team</th>
              <th>Letzter Platz</th>
              <th>Team</th>
              <th>Organisator Folgejahr</th>
            </tr>
          </thead>
          <tbody>
            {winners.map((w) => (
              <tr key={w._id}>
                <td>{new Date(w.date).toLocaleDateString()}</td>
                <td>{w.location}</td>
                <td>{w.winnerUser}</td>
                <td>{w.winnerTeam}</td>
                <td>{w.lastPlaceUser}</td>
                <td>{w.lastPlaceTeam}</td>
                <td>{w.nextOrganizer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
