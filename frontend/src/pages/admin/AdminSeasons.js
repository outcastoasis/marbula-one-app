import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightLong,
  faCalendarDays,
  faCheck,
  faFlagCheckered,
  faLock,
  faLockOpen,
  faPlus,
  faTrashCan,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import API from "../../api";
import { useToast } from "../../context/ToastContext";
import "../../styles/AdminSeasons.css";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("de-CH");
}

function getApiErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback;
}

export default function AdminSeasons() {
  const toast = useToast();
  const [seasons, setSeasons] = useState([]);
  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [participants, setParticipants] = useState([]);
  const [teams, setTeams] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const sortedSeasons = useMemo(
    () =>
      [...seasons].sort(
        (a, b) => new Date(b.eventDate || 0) - new Date(a.eventDate || 0),
      ),
    [seasons],
  );

  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) =>
        String(a?.username || "").localeCompare(String(b?.username || ""), "de-CH", {
          sensitivity: "base",
          numeric: true,
        }),
      ),
    [users],
  );

  const sortedTeams = useMemo(
    () =>
      [...allTeams].sort((a, b) =>
        String(a?.name || "").localeCompare(String(b?.name || ""), "de-CH", {
          sensitivity: "base",
          numeric: true,
        }),
      ),
    [allTeams],
  );

  const filteredUsers = useMemo(() => {
    const normalizedQuery = userSearchQuery.trim().toLocaleLowerCase("de-CH");
    if (!normalizedQuery) {
      return sortedUsers;
    }

    return sortedUsers.filter((user) =>
      [user?.username, user?.realname].some((value) =>
        String(value || "").toLocaleLowerCase("de-CH").includes(normalizedQuery),
      ),
    );
  }, [sortedUsers, userSearchQuery]);

  const filteredTeams = useMemo(() => {
    const normalizedQuery = teamSearchQuery.trim().toLocaleLowerCase("de-CH");
    if (!normalizedQuery) {
      return sortedTeams;
    }

    return sortedTeams.filter((team) =>
      String(team?.name || "")
        .toLocaleLowerCase("de-CH")
        .includes(normalizedQuery),
    );
  }, [sortedTeams, teamSearchQuery]);

  const fetchData = useCallback(
    async ({ showErrorToast = true } = {}) => {
      setIsLoading(true);
      try {
        const [seasonsRes, usersRes, teamsRes] = await Promise.all([
          API.get("/seasons"),
          API.get("/users"),
          API.get("/teams"),
        ]);

        setSeasons(Array.isArray(seasonsRes.data) ? seasonsRes.data : []);
        setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
        setAllTeams(Array.isArray(teamsRes.data) ? teamsRes.data : []);
        return true;
      } catch (error) {
        console.error("Fehler beim Laden:", error);
        if (showErrorToast) {
          toast.error("Daten konnten nicht geladen werden.");
        }
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleSelection = (id, setState) => {
    setState((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleMany = (items, selectedItems, setState) => {
    const itemIds = items.map((item) => item?._id).filter(Boolean);
    if (itemIds.length === 0) {
      return;
    }

    const areAllSelected = itemIds.every((itemId) => selectedItems.includes(itemId));

    setState((prev) =>
      areAllSelected
        ? prev.filter((itemId) => !itemIds.includes(itemId))
        : [...new Set([...prev, ...itemIds])],
    );
  };

  const selectedVisibleUsersCount = filteredUsers.filter((user) =>
    participants.includes(user._id),
  ).length;
  const selectedVisibleTeamsCount = filteredTeams.filter((team) =>
    teams.includes(team._id),
  ).length;
  const isFilteringUsers = userSearchQuery.trim().length > 0;
  const isFilteringTeams = teamSearchQuery.trim().length > 0;

  const getBulkToggleLabel = (isFiltering, visibleCount, selectedVisibleCount) => {
    if (visibleCount === 0) {
      return isFiltering ? "Keine Treffer" : "Keine Einträge";
    }

    if (selectedVisibleCount === visibleCount) {
      return isFiltering ? "Sichtbare abwählen" : "Alle abwählen";
    }

    return isFiltering ? "Sichtbare auswählen" : "Alle auswählen";
  };

  const addSeason = async () => {
    if (!name.trim() || !eventDate) {
      toast.info("Bitte mindestens Name und Event-Datum ausfüllen.");
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
      setUserSearchQuery("");
      setTeamSearchQuery("");

      const refreshed = await fetchData({ showErrorToast: false });
      if (!refreshed) {
        toast.info(
          "Season wurde erstellt, aber die Liste konnte nicht aktualisiert werden.",
        );
        return;
      }

      toast.success("Season wurde erfolgreich erstellt.");
    } catch (error) {
      console.error("Fehler beim Erstellen der Season:", error);
      toast.error(getApiErrorMessage(error, "Season konnte nicht erstellt werden."));
    }
  };

  const deleteSeason = async (season) => {
    if (!window.confirm(`Season "${season.name}" wirklich löschen?`)) return;

    try {
      await API.delete(`/seasons/${season._id}`);

      const refreshed = await fetchData({ showErrorToast: false });
      if (!refreshed) {
        toast.info(
          "Season wurde gelöscht, aber die Liste konnte nicht aktualisiert werden.",
        );
        return;
      }

      toast.success("Season wurde gelöscht.");
    } catch (error) {
      console.error("Fehler beim Löschen der Season:", error);
      toast.error(getApiErrorMessage(error, "Season konnte nicht gelöscht werden."));
    }
  };

  const setCurrentSeason = async (seasonId) => {
    try {
      await API.put(`/seasons/${seasonId}/set-current`);

      const refreshed = await fetchData({ showErrorToast: false });
      if (!refreshed) {
        toast.info(
          "Aktuelle Season wurde gesetzt, aber die Liste konnte nicht aktualisiert werden.",
        );
        return;
      }

      toast.success("Aktuelle Season wurde aktualisiert.");
    } catch (error) {
      console.error("Fehler beim Setzen der aktuellen Season:", error);
      toast.error(
        getApiErrorMessage(error, "Aktuelle Season konnte nicht gesetzt werden."),
      );
    }
  };

  const setCompletedStatus = async (seasonId, nextCompleted) => {
    try {
      await API.put(`/seasons/${seasonId}/set-completed`, {
        isCompleted: nextCompleted,
      });

      const refreshed = await fetchData({ showErrorToast: false });
      if (!refreshed) {
        toast.info(
          "Season-Status wurde geändert, aber die Liste konnte nicht aktualisiert werden.",
        );
        return;
      }

      toast.success(
        nextCompleted
          ? "Season wurde als abgeschlossen markiert."
          : "Season wurde wieder geöffnet.",
      );
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Season-Status:", error);
      toast.error(
        getApiErrorMessage(error, "Season-Status konnte nicht geändert werden."),
      );
    }
  };

  return (
    <div className="admin-seasons-page">
      <header className="admin-seasons-header">
        <h1>Seasons verwalten</h1>
        <p>
          Erstelle Seasons, ordne Teams und Benutzer zu und setze die aktuelle
          Season. Schliesse eine Season ab, damit sie in den Stats erscheint.
        </p>
      </header>

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
                    <span className="admin-season-date">
                      <FontAwesomeIcon icon={faCalendarDays} />
                      {formatDate(season.eventDate)}
                    </span>
                    {season.isCurrent || season.isCompleted ? (
                      <div className="admin-season-badges">
                        {season.isCurrent && (
                          <span className="current-badge">
                            <FontAwesomeIcon icon={faCheck} /> Aktuell
                          </span>
                        )}
                        {season.isCompleted && (
                          <span className="completed-badge">
                            <FontAwesomeIcon icon={faLock} /> Abgeschlossen
                          </span>
                        )}
                      </div>
                    ) : null}
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
                    className="admin-seasons-action"
                    onClick={() =>
                      setCompletedStatus(season._id, !season.isCompleted)
                    }
                  >
                    <FontAwesomeIcon
                      icon={season.isCompleted ? faLockOpen : faLock}
                    />
                    {season.isCompleted ? "Wieder öffnen" : "Abschliessen"}
                  </button>
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
              <div className="admin-seasons-select-actions">
                <span className="admin-seasons-selection-summary">
                  {participants.length} von {sortedUsers.length} ausgewählt
                </span>
                <button
                  type="button"
                  className="admin-seasons-toggle"
                  onClick={() =>
                    toggleMany(filteredUsers, participants, setParticipants)
                  }
                  disabled={filteredUsers.length === 0}
                >
                  {getBulkToggleLabel(
                    isFilteringUsers,
                    filteredUsers.length,
                    selectedVisibleUsersCount,
                  )}
                </button>
              </div>
            </div>

            <input
              type="search"
              className="admin-seasons-search-input"
              placeholder="Benutzer suchen..."
              aria-label="Benutzer suchen"
              value={userSearchQuery}
              onChange={(event) => setUserSearchQuery(event.target.value)}
            />

            {sortedUsers.length === 0 ? (
              <p className="admin-seasons-empty">Keine Benutzer verfügbar.</p>
            ) : filteredUsers.length === 0 ? (
              <p className="admin-seasons-empty">
                Keine Benutzer für "{userSearchQuery.trim()}" gefunden.
              </p>
            ) : (
              <div className="admin-seasons-checkbox-list">
                {filteredUsers.map((user) => {
                  const isSelected = participants.includes(user._id);
                  return (
                    <label key={user._id} className="admin-seasons-checkbox">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelection(user._id, setParticipants)}
                      />
                      <span>
                        {user.username}
                        {user.realname && user.realname !== user.username
                          ? ` (${user.realname})`
                          : ""}
                      </span>
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
              <div className="admin-seasons-select-actions">
                <span className="admin-seasons-selection-summary">
                  {teams.length} von {sortedTeams.length} ausgewählt
                </span>
                <button
                  type="button"
                  className="admin-seasons-toggle"
                  onClick={() => toggleMany(filteredTeams, teams, setTeams)}
                  disabled={filteredTeams.length === 0}
                >
                  {getBulkToggleLabel(
                    isFilteringTeams,
                    filteredTeams.length,
                    selectedVisibleTeamsCount,
                  )}
                </button>
              </div>
            </div>

            <input
              type="search"
              className="admin-seasons-search-input"
              placeholder="Teams suchen..."
              aria-label="Teams suchen"
              value={teamSearchQuery}
              onChange={(event) => setTeamSearchQuery(event.target.value)}
            />

            {sortedTeams.length === 0 ? (
              <p className="admin-seasons-empty">Keine Teams verfügbar.</p>
            ) : filteredTeams.length === 0 ? (
              <p className="admin-seasons-empty">
                Keine Teams für "{teamSearchQuery.trim()}" gefunden.
              </p>
            ) : (
              <div className="admin-seasons-checkbox-list">
                {filteredTeams.map((team) => {
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
          <button
            type="button"
            className="admin-seasons-button"
            onClick={addSeason}
          >
            <FontAwesomeIcon icon={faPlus} /> Season hinzufügen
          </button>
        </div>
      </section>
    </div>
  );
}
