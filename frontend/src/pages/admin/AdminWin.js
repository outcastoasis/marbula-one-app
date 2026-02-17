import { useEffect, useState } from "react";
import API from "../../api";
import "../../styles/AdminWin.css";

const initialFormData = {
  date: "",
  location: "",
  winnerUser: "",
  winnerTeam: "",
  lastPlaceUser: "",
  lastPlaceTeam: "",
  notes: "",
};

export default function AdminWin() {
  const [formData, setFormData] = useState(initialFormData);
  const [winners, setWinners] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    fetchWinners();
  }, []);

  const fetchWinners = async () => {
    setIsLoading(true);
    try {
      const response = await API.get("/winners");
      setWinners(response.data);
    } catch (error) {
      console.error("Fehler beim Laden der Gewinner:", error);
      setNotice({ type: "error", text: "Gewinner konnten nicht geladen werden." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      if (editingId) {
        await API.put(`/winners/${editingId}`, formData);
        setNotice({ type: "success", text: "Eintrag wurde aktualisiert." });
      } else {
        await API.post("/winners", formData);
        setNotice({ type: "success", text: "Eintrag wurde erfolgreich gespeichert." });
      }

      resetForm();
      fetchWinners();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      setNotice({ type: "error", text: "Eintrag konnte nicht gespeichert werden." });
    }
  };

  const handleEdit = (entry) => {
    setFormData({
      date: entry.date?.slice(0, 10) || "",
      location: entry.location || "",
      winnerUser: entry.winnerUser || "",
      winnerTeam: entry.winnerTeam || "",
      lastPlaceUser: entry.lastPlaceUser || "",
      lastPlaceTeam: entry.lastPlaceTeam || "",
      notes: entry.notes || "",
    });
    setEditingId(entry._id);
    setNotice(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Diesen Eintrag wirklich löschen?")) return;

    try {
      await API.delete(`/winners/${id}`);
      setNotice({ type: "success", text: "Eintrag wurde gelöscht." });
      if (editingId === id) {
        resetForm();
      }
      fetchWinners();
    } catch (error) {
      console.error("Fehler beim Löschen:", error);
      setNotice({ type: "error", text: "Eintrag konnte nicht gelöscht werden." });
    }
  };

  return (
    <div className="admin-win-page">
      <header className="admin-win-header">
        <h1>Event-Sieger verwalten</h1>
        <p>Pflege Gewinner, Teams und letzte Plätze für vergangene Events.</p>
      </header>

      {notice && <p className={`admin-win-notice ${notice.type}`}>{notice.text}</p>}

      <section className="admin-win-panel">
        <div className="admin-win-panel-head">
          <h2>{editingId ? "Eintrag bearbeiten" : "Neuen Eintrag erstellen"}</h2>
        </div>

        <form onSubmit={handleSubmit} className="admin-win-form">
          <label className="admin-win-field">
            <span>Datum</span>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </label>

          <label className="admin-win-field">
            <span>Ort</span>
            <input
              type="text"
              name="location"
              placeholder="z. B. Midnight Bay"
              value={formData.location}
              onChange={handleChange}
              required
            />
          </label>

          <label className="admin-win-field">
            <span>Gewinner (Name)</span>
            <input
              type="text"
              name="winnerUser"
              placeholder="Name des Gewinners"
              value={formData.winnerUser}
              onChange={handleChange}
              required
            />
          </label>

          <label className="admin-win-field">
            <span>Gewinner-Team</span>
            <input
              type="text"
              name="winnerTeam"
              placeholder="Team des Gewinners"
              value={formData.winnerTeam}
              onChange={handleChange}
              required
            />
          </label>

          <label className="admin-win-field">
            <span>Letzter Platz (Name)</span>
            <input
              type="text"
              name="lastPlaceUser"
              placeholder="Name des letzten Platzes"
              value={formData.lastPlaceUser}
              onChange={handleChange}
              required
            />
          </label>

          <label className="admin-win-field">
            <span>Team letzter Platz</span>
            <input
              type="text"
              name="lastPlaceTeam"
              placeholder="Team des letzten Platzes"
              value={formData.lastPlaceTeam}
              onChange={handleChange}
              required
            />
          </label>

          <label className="admin-win-field admin-win-field-full">
            <span>Notizen (optional)</span>
            <textarea
              name="notes"
              placeholder="Zusätzliche Informationen zum Event"
              value={formData.notes}
              onChange={handleChange}
            />
          </label>

          <div className="admin-win-form-actions">
            <button type="submit" className="admin-win-button">
              {editingId ? "Änderungen speichern" : "Speichern"}
            </button>
            {editingId && (
              <button type="button" className="admin-win-button ghost" onClick={resetForm}>
                Abbrechen
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="admin-win-panel">
        <div className="admin-win-panel-head">
          <h2>Vergangene Events</h2>
          <span className="admin-win-count">
            {winners.length} {winners.length === 1 ? "Eintrag" : "Einträge"}
          </span>
        </div>

        {isLoading ? (
          <p className="admin-win-state">Lade Einträge…</p>
        ) : winners.length === 0 ? (
          <p className="admin-win-state">Noch keine Event-Sieger eingetragen.</p>
        ) : (
          <div className="admin-win-table-wrapper">
            <table className="admin-win-table">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Ort</th>
                  <th>Gewinner</th>
                  <th>Gewinner-Team</th>
                  <th>Letzter Platz</th>
                  <th>Team letzter Platz</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {winners.map((winner) => (
                  <tr key={winner._id}>
                    <td data-label="Datum">
                      {winner.date
                        ? new Date(winner.date).toLocaleDateString("de-CH")
                        : "—"}
                    </td>
                    <td data-label="Ort">{winner.location || "—"}</td>
                    <td data-label="Gewinner">{winner.winnerUser || "—"}</td>
                    <td data-label="Gewinner-Team">{winner.winnerTeam || "—"}</td>
                    <td data-label="Letzter Platz">{winner.lastPlaceUser || "—"}</td>
                    <td data-label="Team letzter Platz">{winner.lastPlaceTeam || "—"}</td>
                    <td data-label="Aktionen">
                      <div className="winner-actions">
                        <button
                          type="button"
                          className="admin-win-action"
                          onClick={() => handleEdit(winner)}
                        >
                          Bearbeiten
                        </button>
                        <button
                          type="button"
                          className="admin-win-action danger"
                          onClick={() => handleDelete(winner._id)}
                        >
                          Löschen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
