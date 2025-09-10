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
    notes: "",
  });

  const [winners, setWinners] = useState([]);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchWinners();
  }, []);

  const fetchWinners = async () => {
    try {
      const res = await API.get("/winners");
      setWinners(res.data);
    } catch (err) {
      console.error("Fehler beim Laden der Gewinner:", err);
    }
  };

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const resetForm = () => {
    setFormData({
      date: "",
      location: "",
      winnerUser: "",
      winnerTeam: "",
      lastPlaceUser: "",
      lastPlaceTeam: "",
      notes: "",
    });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await API.put(`/winners/${editingId}`, formData);
        alert("Eintrag aktualisiert!");
      } else {
        await API.post("/winners", formData);
        alert("Erfolgreich eingetragen!");
      }

      resetForm();
      fetchWinners();
    } catch (err) {
      console.error(err);
      alert("Fehler beim Speichern.");
    }
  };

  const handleEdit = (entry) => {
    setFormData({
      date: entry.date?.slice(0, 10),
      location: entry.location,
      winnerUser: entry.winnerUser,
      winnerTeam: entry.winnerTeam,
      lastPlaceUser: entry.lastPlaceUser,
      lastPlaceTeam: entry.lastPlaceTeam,
      notes: entry.notes || "",
    });
    setEditingId(entry._id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Diesen Eintrag wirklich löschen?")) return;
    try {
      await API.delete(`/winners/${id}`);
      fetchWinners();
    } catch (err) {
      console.error(err);
      alert("Fehler beim Löschen.");
    }
  };

  return (
    <div className="admin-win-container">
      <h2>{editingId ? "Eintrag bearbeiten" : "Event-Sieger eintragen"}</h2>

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
        <textarea
          name="notes"
          placeholder="Notizen (optional)"
          value={formData.notes}
          onChange={handleChange}
        ></textarea>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button type="submit">
            {editingId ? "Änderungen speichern" : "Speichern"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm}>
              Abbrechen
            </button>
          )}
        </div>
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
              <th>Aktionen</th>
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
                <td>
                  <div className="winner-actions">
                    <button onClick={() => handleEdit(w)}>Bearbeiten</button>
                    <button onClick={() => handleDelete(w._id)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
