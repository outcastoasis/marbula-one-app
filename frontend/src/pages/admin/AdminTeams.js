import { useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAlignLeft,
  faFloppyDisk,
  faImage,
  faPalette,
  faPenToSquare,
  faPlus,
  faTrashCan,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import API from "../../api";
import { useToast } from "../../context/ToastContext";
import "../../styles/AdminTeams.css";

function getTeamColor(color) {
  if (!color || typeof color !== "string") {
    return "#525252";
  }

  return color.startsWith("#") ? color : "#525252";
}

function getTeamColorFade(color) {
  return color.startsWith("#") ? `${color}22` : "rgba(255, 255, 255, 0.04)";
}

function getApiErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback;
}

export default function AdminTeams() {
  const toast = useToast();
  const [teams, setTeams] = useState([]);
  const [newTeam, setNewTeam] = useState({
    name: "",
    color: "",
    logoUrl: "",
    description: "",
  });
  const [editTeamId, setEditTeamId] = useState(null);
  const [editTeamData, setEditTeamData] = useState({
    name: "",
    color: "",
    logoUrl: "",
    description: "",
  });

  const fetchTeams = useCallback(
    async ({ showErrorToast = true } = {}) => {
      try {
        const res = await API.get("/teams");
        setTeams(res.data);
        return true;
      } catch (error) {
        console.error("Fehler beim Laden der Teams:", error);
        if (showErrorToast) {
          toast.error("Teams konnten nicht geladen werden.");
        }
        return false;
      }
    },
    [toast],
  );

  const addTeam = async () => {
    if (!newTeam.name.trim()) {
      toast.info("Bitte gib einen Teamnamen ein.");
      return;
    }

    try {
      await API.post("/teams", newTeam);
      setNewTeam({ name: "", color: "", logoUrl: "", description: "" });
      const refreshed = await fetchTeams({ showErrorToast: false });

      if (!refreshed) {
        toast.info(
          "Team wurde hinzugefügt, aber die Liste konnte nicht aktualisiert werden.",
        );
        return;
      }

      toast.success("Team erfolgreich hinzugefügt.");
    } catch (error) {
      console.error("Fehler beim Hinzufügen des Teams:", error);
      toast.error(getApiErrorMessage(error, "Fehler beim Hinzufügen des Teams."));
    }
  };

  const deleteTeam = async (id) => {
    if (!window.confirm("Team wirklich löschen?")) return;

    try {
      await API.delete(`/teams/${id}`);
      const refreshed = await fetchTeams({ showErrorToast: false });

      if (!refreshed) {
        toast.info(
          "Team wurde gelöscht, aber die Liste konnte nicht aktualisiert werden.",
        );
        return;
      }

      toast.success("Team erfolgreich gelöscht.");
    } catch (error) {
      console.error("Fehler beim Löschen des Teams:", error);
      toast.error(getApiErrorMessage(error, "Fehler beim Löschen des Teams."));
    }
  };

  const startEdit = (team) => {
    setEditTeamId(team._id);
    setEditTeamData({
      name: team.name || "",
      color: team.color || "",
      logoUrl: team.logoUrl || "",
      description: team.description || "",
    });
  };

  const cancelEdit = () => {
    setEditTeamId(null);
    setEditTeamData({ name: "", color: "", logoUrl: "", description: "" });
  };

  const saveEdit = async () => {
    if (!editTeamId) {
      toast.info("Kein Team zum Speichern ausgewählt.");
      return;
    }

    if (!editTeamData.name.trim()) {
      toast.info("Bitte gib einen Teamnamen ein.");
      return;
    }

    try {
      await API.put(`/teams/${editTeamId}`, editTeamData);
      cancelEdit();
      const refreshed = await fetchTeams({ showErrorToast: false });

      if (!refreshed) {
        toast.info(
          "Team wurde gespeichert, aber die Liste konnte nicht aktualisiert werden.",
        );
        return;
      }

      toast.success("Team erfolgreich gespeichert.");
    } catch (error) {
      console.error("Fehler beim Speichern des Teams:", error);
      toast.error(getApiErrorMessage(error, "Fehler beim Speichern des Teams."));
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  return (
    <div className="admin-teams-page">
      <header className="admin-teams-header">
        <h1>Teams verwalten</h1>
        <p>
          Lege neue Teams an, pflege bestehende Einträge und halte die Teamdaten
          konsistent.
        </p>
      </header>

      <section className="admin-teams-panel team-form-panel">
        <h2>Neues Team anlegen</h2>
        <div className="team-form-grid">
          <label className="team-field">
            <span>Teamname</span>
            <input
              placeholder="z. B. Raspberry Racers"
              value={newTeam.name}
              onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
            />
          </label>

          <label className="team-field">
            <span>
              <FontAwesomeIcon icon={faPalette} /> Teamfarbe (Hex)
            </span>
            <input
              type="text"
              placeholder="#ff0000"
              value={newTeam.color}
              onChange={(e) => setNewTeam({ ...newTeam, color: e.target.value })}
            />
          </label>

          <label className="team-field">
            <span>
              <FontAwesomeIcon icon={faImage} /> Logo-URL
            </span>
            <input
              type="text"
              placeholder="https://..."
              value={newTeam.logoUrl}
              onChange={(e) =>
                setNewTeam({ ...newTeam, logoUrl: e.target.value })
              }
            />
          </label>

          <label className="team-field team-field-full">
            <span>
              <FontAwesomeIcon icon={faAlignLeft} /> Beschreibung
            </span>
            <textarea
              placeholder="Kurzbeschreibung zum Team"
              value={newTeam.description}
              onChange={(e) =>
                setNewTeam({ ...newTeam, description: e.target.value })
              }
              className="team-textarea"
            />
          </label>

          <div className="team-form-actions">
            <button
              type="button"
              className="team-primary-button"
              onClick={addTeam}
            >
              <FontAwesomeIcon icon={faPlus} />
              Team hinzufügen
            </button>
          </div>
        </div>
      </section>

      <section className="admin-teams-panel">
        <div className="team-list-header">
          <h2>Bestehende Teams</h2>
          <span className="team-count">
            {teams.length} {teams.length === 1 ? "Team" : "Teams"}
          </span>
        </div>

        {teams.length === 0 ? (
          <p className="team-empty-state">Noch keine Teams vorhanden.</p>
        ) : (
          <div className="team-list-grid">
            {teams.map((team) => {
              const teamColor = getTeamColor(team.color);

              return (
                <article
                  key={team._id}
                  className="team-admin-card"
                  style={{
                    "--team-color": teamColor,
                    "--team-color-fade": getTeamColorFade(teamColor),
                  }}
                >
                  {editTeamId === team._id ? (
                    <div className="team-edit-grid">
                      <label className="team-field">
                        <span>Teamname</span>
                        <input
                          className="team-edit-input"
                          value={editTeamData.name}
                          onChange={(e) =>
                            setEditTeamData({
                              ...editTeamData,
                              name: e.target.value,
                            })
                          }
                        />
                      </label>

                      <label className="team-field">
                        <span>
                          <FontAwesomeIcon icon={faPalette} /> Teamfarbe (Hex)
                        </span>
                        <input
                          className="team-edit-input"
                          value={editTeamData.color}
                          onChange={(e) =>
                            setEditTeamData({
                              ...editTeamData,
                              color: e.target.value,
                            })
                          }
                        />
                      </label>

                      <label className="team-field team-field-full">
                        <span>
                          <FontAwesomeIcon icon={faImage} /> Logo-URL
                        </span>
                        <input
                          className="team-edit-input"
                          value={editTeamData.logoUrl}
                          onChange={(e) =>
                            setEditTeamData({
                              ...editTeamData,
                              logoUrl: e.target.value,
                            })
                          }
                        />
                      </label>

                      <label className="team-field team-field-full">
                        <span>
                          <FontAwesomeIcon icon={faAlignLeft} /> Beschreibung
                        </span>
                        <textarea
                          className="team-edit-textarea"
                          value={editTeamData.description}
                          onChange={(e) =>
                            setEditTeamData({
                              ...editTeamData,
                              description: e.target.value,
                            })
                          }
                        />
                      </label>

                      <div className="team-actions">
                        <button
                          type="button"
                          className="team-primary-button compact"
                          onClick={saveEdit}
                        >
                          <FontAwesomeIcon icon={faFloppyDisk} />
                          Speichern
                        </button>
                        <button
                          type="button"
                          className="team-ghost-button compact"
                          onClick={cancelEdit}
                        >
                          <FontAwesomeIcon icon={faXmark} />
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="team-admin-card-head">
                        <div className="team-logo-box">
                          {team.logoUrl ? (
                            <img
                              src={team.logoUrl}
                              alt={`${team.name} Logo`}
                              className="team-logo-small"
                            />
                          ) : (
                            <span className="team-logo-fallback">
                              {team.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="team-head-copy">
                          <h3>{team.name}</h3>
                          <span className="team-color-pill">
                            {team.color || "Keine Farbe definiert"}
                          </span>
                        </div>
                      </div>

                      <div className="team-actions">
                        <button
                          type="button"
                          className="team-ghost-button team-card-action"
                          onClick={() => startEdit(team)}
                        >
                          <FontAwesomeIcon icon={faPenToSquare} />
                          Bearbeiten
                        </button>
                        <button
                          type="button"
                          className="team-ghost-button danger team-card-action"
                          onClick={() => deleteTeam(team._id)}
                        >
                          <FontAwesomeIcon icon={faTrashCan} />
                          Löschen
                        </button>
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
