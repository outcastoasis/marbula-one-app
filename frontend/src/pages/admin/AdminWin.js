import { useEffect, useState } from "react";
import API from "../../api";
import { useToast } from "../../context/ToastContext";
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

function getApiErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback;
}

export default function AdminWin() {
  const toast = useToast();
  const [createFormData, setCreateFormData] = useState(initialFormData);
  const [editFormData, setEditFormData] = useState(initialFormData);
  const [winners, setWinners] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWinners();
  }, []);

  const fetchWinners = async ({ showErrorToast = true } = {}) => {
    setIsLoading(true);
    try {
      const response = await API.get("/winners");
      setWinners(Array.isArray(response.data) ? response.data : []);
      return true;
    } catch (error) {
      console.error("Fehler beim Laden der Gewinner:", error);
      if (showErrorToast) {
        toast.error("Gewinner konnten nicht geladen werden.");
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateChange = (event) => {
    setCreateFormData({
      ...createFormData,
      [event.target.name]: event.target.value,
    });
  };

  const handleEditChange = (event) => {
    setEditFormData({
      ...editFormData,
      [event.target.name]: event.target.value,
    });
  };

  const resetCreateForm = () => {
    setCreateFormData(initialFormData);
  };

  const closeInlineEdit = () => {
    setEditingId(null);
    setEditFormData(initialFormData);
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    try {
      await API.post("/winners", createFormData);
      resetCreateForm();
      const refreshed = await fetchWinners({ showErrorToast: false });

      if (!refreshed) {
        toast.info(
          "Eintrag wurde gespeichert, aber die Liste konnte nicht aktualisiert werden.",
        );
        return;
      }

      toast.success("Eintrag wurde erfolgreich gespeichert.");
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      toast.error(getApiErrorMessage(error, "Eintrag konnte nicht gespeichert werden."));
    }
  };

  const openInlineEdit = (entry) => {
    setEditFormData({
      date: entry.date?.slice(0, 10) || "",
      location: entry.location || "",
      winnerUser: entry.winnerUser || "",
      winnerTeam: entry.winnerTeam || "",
      lastPlaceUser: entry.lastPlaceUser || "",
      lastPlaceTeam: entry.lastPlaceTeam || "",
      notes: entry.notes || "",
    });
    setEditingId(entry._id);
  };

  const handleInlineEditSubmit = async (event, id) => {
    event.preventDefault();
    try {
      await API.put(`/winners/${id}`, editFormData);
      closeInlineEdit();
      const refreshed = await fetchWinners({ showErrorToast: false });

      if (!refreshed) {
        toast.info(
          "Eintrag wurde aktualisiert, aber die Liste konnte nicht aktualisiert werden.",
        );
        return;
      }

      toast.success("Eintrag wurde aktualisiert.");
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      toast.error(
        getApiErrorMessage(error, "Eintrag konnte nicht aktualisiert werden."),
      );
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Diesen Eintrag wirklich löschen?")) return;

    try {
      await API.delete(`/winners/${id}`);
      if (editingId === id) {
        closeInlineEdit();
      }
      const refreshed = await fetchWinners({ showErrorToast: false });

      if (!refreshed) {
        toast.info(
          "Eintrag wurde gelöscht, aber die Liste konnte nicht aktualisiert werden.",
        );
        return;
      }

      toast.success("Eintrag wurde gelöscht.");
    } catch (error) {
      console.error("Fehler beim Löschen:", error);
      toast.error(getApiErrorMessage(error, "Eintrag konnte nicht gelöscht werden."));
    }
  };

  return (
    <div className="admin-win-page">
      <header className="admin-win-header">
        <h1>Event-Sieger verwalten</h1>
        <p>Pflege Gewinner, Teams und letzte Plätze für vergangene Events.</p>
      </header>

      <section className="admin-win-panel">
        <div className="admin-win-panel-head">
          <h2>Neuen Eintrag erstellen</h2>
        </div>

        <form onSubmit={handleCreateSubmit} className="admin-win-form">
          <label className="admin-win-field">
            <span>Datum</span>
            <input
              type="date"
              name="date"
              value={createFormData.date}
              onChange={handleCreateChange}
              required
            />
          </label>

          <label className="admin-win-field">
            <span>Ort</span>
            <input
              type="text"
              name="location"
              placeholder="z. B. Midnight Bay"
              value={createFormData.location}
              onChange={handleCreateChange}
              required
            />
          </label>

          <label className="admin-win-field">
            <span>Gewinner (Name)</span>
            <input
              type="text"
              name="winnerUser"
              placeholder="Name des Gewinners"
              value={createFormData.winnerUser}
              onChange={handleCreateChange}
              required
            />
          </label>

          <label className="admin-win-field">
            <span>Gewinner-Team</span>
            <input
              type="text"
              name="winnerTeam"
              placeholder="Team des Gewinners"
              value={createFormData.winnerTeam}
              onChange={handleCreateChange}
              required
            />
          </label>

          <label className="admin-win-field">
            <span>Letzter Platz (Name)</span>
            <input
              type="text"
              name="lastPlaceUser"
              placeholder="Name des letzten Platzes"
              value={createFormData.lastPlaceUser}
              onChange={handleCreateChange}
              required
            />
          </label>

          <label className="admin-win-field">
            <span>Team letzter Platz</span>
            <input
              type="text"
              name="lastPlaceTeam"
              placeholder="Team des letzten Platzes"
              value={createFormData.lastPlaceTeam}
              onChange={handleCreateChange}
              required
            />
          </label>

          <label className="admin-win-field admin-win-field-full">
            <span>Notizen (optional)</span>
            <textarea
              name="notes"
              placeholder="Zusätzliche Informationen zum Event"
              value={createFormData.notes}
              onChange={handleCreateChange}
            />
          </label>

          <div className="admin-win-form-actions">
            <button type="submit" className="admin-win-button">
              Speichern
            </button>
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
                {winners.map((winner) => {
                  const isEditing = editingId === winner._id;

                  return (
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
                      <td data-label="Team letzter Platz">
                        {winner.lastPlaceTeam || "—"}
                      </td>
                      <td data-label="Aktionen">
                        <div className="winner-actions">
                          <button
                            type="button"
                            className="admin-win-action"
                            onClick={() =>
                              isEditing ? closeInlineEdit() : openInlineEdit(winner)
                            }
                          >
                            {isEditing ? "Schliessen" : "Bearbeiten"}
                          </button>
                          <button
                            type="button"
                            className="admin-win-action danger"
                            onClick={() => handleDelete(winner._id)}
                          >
                            Löschen
                          </button>
                        </div>

                        {isEditing && (
                          <form
                            className="admin-win-inline-form"
                            onSubmit={(event) =>
                              handleInlineEditSubmit(event, winner._id)
                            }
                          >
                            <div className="admin-win-inline-grid">
                              <label className="admin-win-inline-field">
                                <span>Datum</span>
                                <input
                                  type="date"
                                  name="date"
                                  value={editFormData.date}
                                  onChange={handleEditChange}
                                  required
                                />
                              </label>

                              <label className="admin-win-inline-field">
                                <span>Ort</span>
                                <input
                                  type="text"
                                  name="location"
                                  value={editFormData.location}
                                  onChange={handleEditChange}
                                  required
                                />
                              </label>

                              <label className="admin-win-inline-field">
                                <span>Gewinner (Name)</span>
                                <input
                                  type="text"
                                  name="winnerUser"
                                  value={editFormData.winnerUser}
                                  onChange={handleEditChange}
                                  required
                                />
                              </label>

                              <label className="admin-win-inline-field">
                                <span>Gewinner-Team</span>
                                <input
                                  type="text"
                                  name="winnerTeam"
                                  value={editFormData.winnerTeam}
                                  onChange={handleEditChange}
                                  required
                                />
                              </label>

                              <label className="admin-win-inline-field">
                                <span>Letzter Platz (Name)</span>
                                <input
                                  type="text"
                                  name="lastPlaceUser"
                                  value={editFormData.lastPlaceUser}
                                  onChange={handleEditChange}
                                  required
                                />
                              </label>

                              <label className="admin-win-inline-field">
                                <span>Team letzter Platz</span>
                                <input
                                  type="text"
                                  name="lastPlaceTeam"
                                  value={editFormData.lastPlaceTeam}
                                  onChange={handleEditChange}
                                  required
                                />
                              </label>

                              <label className="admin-win-inline-field admin-win-inline-field-full">
                                <span>Notizen</span>
                                <textarea
                                  name="notes"
                                  value={editFormData.notes}
                                  onChange={handleEditChange}
                                />
                              </label>
                            </div>

                            <div className="admin-win-inline-actions">
                              <button type="submit" className="admin-win-button small">
                                Änderungen speichern
                              </button>
                              <button
                                type="button"
                                className="admin-win-button ghost small"
                                onClick={closeInlineEdit}
                              >
                                Abbrechen
                              </button>
                            </div>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
