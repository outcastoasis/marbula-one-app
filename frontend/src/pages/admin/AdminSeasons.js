import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightLong,
  faCalendarDays,
  faCheck,
  faFlagCheckered,
  faPlus,
  faTrashCan,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import API from "../../api";
import "../../styles/AdminSeasons.css";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("de-CH");
}

export default function AdminSeasons() {
  const [seasons, setSeasons] = useState([]);
  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [participants, setParticipants] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState(null);

  const sortedSeasons = useMemo(
    () =>
      [...seasons].sort(
        (a, b) => new Date(b.eventDate || 0) - new Date(a.eventDate || 0),
      ),
    [seasons],
  );

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [seasonsRes, usersRes, teamsRes] = await Promise.all([
        API.get("/seasons"),
        API.get("/users"),
        API.get("/teams"),
      ]);

      setSeasons(seasonsRes.data);
      setUsers(usersRes.data);
      setAllTeams(teamsRes.data);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
      setNotice({ type: "error", text: "Daten konnten nicht geladen werden." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleSelection = (id, setState) => {
    setState((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleAll = (allItems, selectedItems, setState) => {
    if (selectedItems.length === allItems.length) {
      setState([]);
    } else {
      setState(allItems.map((item) => item._id));
    }
  };

  const addSeason = async () => {
    if (!name.trim() || !eventDate) {
      setNotice({
        type: "error",
        text: "Bitte mindestens Name und Event-Datum ausfüllen.",
      });
      return;
    }

    try {
      await API.post("/seasons", {
        name: name.trim(),
        eventDate,
        participants,
        teams,
      });

      setName("");
      setEventDate("");
      setParticipants([]);
      setTeams([]);
      setNotice({ type: "success", text: "Season wurde erfolgreich erstellt." });
      fetchData();
    } catch (error) {
      console.error("Fehler beim Erstellen der Season:", error);
      setNotice({
        type: "error",
        text: "Season konnte nicht erstellt werden.",
      });
    }
  };

  const deleteSeason = async (season) => {
    if (!window.confirm(`Season "${season.name}" wirklich löschen?`)) return;

    try {
      await API.delete(`/seasons/${season._id}`);
      setNotice({ type: "success", text: "Season wurde gelöscht." });
      fetchData();
    } catch (error) {
      console.error("Fehler beim Löschen der Season:", error);
      setNotice({ type: "error", text: "Season konnte nicht gelöscht werden." });
    }
  };

  const setCurrentSeason = async (seasonId) => {
    try {
      await API.put(`/seasons/${seasonId}/set-current`);
      setNotice({ type: "success", text: "Aktuelle Season wurde aktualisiert." });
      fetchData();
    } catch (error) {
      console.error("Fehler beim Setzen der aktuellen Season:", error);
      setNotice({
        type: "error",
        text: "Aktuelle Season konnte nicht gesetzt werden.",
      });
    }
  };

  return (
    <div className="admin-seasons-page">
      <header className="admin-seasons-header">
        <h1>Seasons verwalten</h1>
        <p>Erstelle Seasons, ordne Teams und Benutzer zu und setze die aktuelle Season.</p>
      </header>

      {notice && (
        <p className={`admin-seasons-notice ${notice.type}`}>{notice.text}</p>
      )}

      <section className="admin-seasons-panel">
        <div className="admin-seasons-panel-head">
          <h2>Neue Season anlegen</h2>
        </div>

        <div className="admin-seasons-form-grid">
          <label className="admin-seasons-field">
            <span>Season-Name</span>
            <input
              type="text"
              placeholder="z. B. Season 5"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <label className="admin-seasons-field">
            <span>
              <FontAwesomeIcon icon={faCalendarDays} /> Event-Datum
            </span>
            <input
              type="date"
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
            />
          </label>
        </div>

        <div className="admin-seasons-select-grid">
          <article className="admin-seasons-select-card">
            <div className="admin-seasons-select-head">
              <h3>
                <FontAwesomeIcon icon={faUsers} /> Teilnehmende Benutzer
              </h3>
              <button
                type="button"
                className="admin-seasons-toggle"
                onClick={() => toggleAll(users, participants, setParticipants)}
              >
                {participants.length === users.length
                  ? "Alle abwählen"
                  : "Alle auswählen"}
              </button>
            </div>

            {users.length === 0 ? (
              <p className="admin-seasons-empty">Keine Benutzer verfügbar.</p>
            ) : (
              <div className="admin-seasons-checkbox-list">
                {users.map((user) => {
                  const isSelected = participants.includes(user._id);
                  return (
                    <label key={user._id} className="admin-seasons-checkbox">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() =>
                          toggleSelection(user._id, setParticipants)
                        }
                      />
                      <span>{user.username}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </article>

          <article className="admin-seasons-select-card">
            <div className="admin-seasons-select-head">
              <h3>
                <FontAwesomeIcon icon={faFlagCheckered} /> Teilnehmende Teams
              </h3>
              <button
                type="button"
                className="admin-seasons-toggle"
                onClick={() => toggleAll(allTeams, teams, setTeams)}
              >
                {teams.length === allTeams.length
                  ? "Alle abwählen"
                  : "Alle auswählen"}
              </button>
            </div>

            {allTeams.length === 0 ? (
              <p className="admin-seasons-empty">Keine Teams verfügbar.</p>
            ) : (
              <div className="admin-seasons-checkbox-list">
                {allTeams.map((team) => {
                  const isSelected = teams.includes(team._id);
                  return (
                    <label key={team._id} className="admin-seasons-checkbox">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelection(team._id, setTeams)}
                      />
                      <span>{team.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </article>
        </div>

        <div className="admin-seasons-form-actions">
          <button type="button" className="admin-seasons-button" onClick={addSeason}>
            <FontAwesomeIcon icon={faPlus} /> Season hinzufügen
          </button>
        </div>
      </section>

      <section className="admin-seasons-panel">
        <div className="admin-seasons-panel-head">
          <h2>Seasons</h2>
          <span className="admin-seasons-count">
            {seasons.length} {seasons.length === 1 ? "Eintrag" : "Einträge"}
          </span>
        </div>

        {isLoading ? (
          <p className="admin-seasons-state">Lade Seasons…</p>
        ) : sortedSeasons.length === 0 ? (
          <p className="admin-seasons-state">Noch keine Seasons vorhanden.</p>
        ) : (
          <div className="admin-seasons-list">
            {sortedSeasons.map((season) => (
              <article
                key={season._id}
                className={`admin-season-card ${season.isCurrent ? "is-current" : ""}`}
              >
                <div className="admin-season-card-main">
                  <h3>{season.name}</h3>
                  <div className="admin-season-meta">
                    <span>
                      <FontAwesomeIcon icon={faCalendarDays} />
                      {formatDate(season.eventDate)}
                    </span>
                    {season.isCurrent && (
                      <span className="current-badge">
                        <FontAwesomeIcon icon={faCheck} /> Aktuell
                      </span>
                    )}
                  </div>
                </div>

                <div className="admin-season-actions">
                  {!season.isCurrent && (
                    <button
                      type="button"
                      className="admin-seasons-action"
                      onClick={() => setCurrentSeason(season._id)}
                    >
                      <FontAwesomeIcon icon={faCheck} /> Als aktuell setzen
                    </button>
                  )}
                  <Link
                    to={`/admin/seasons/${season._id}/races`}
                    className="admin-seasons-action link"
                  >
                    <FontAwesomeIcon icon={faArrowRightLong} /> Rennen verwalten
                  </Link>
                  <button
                    type="button"
                    className="admin-seasons-action danger"
                    onClick={() => deleteSeason(season)}
                  >
                    <FontAwesomeIcon icon={faTrashCan} /> Löschen
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
