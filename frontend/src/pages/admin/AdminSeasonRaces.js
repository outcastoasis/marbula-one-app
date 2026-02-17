import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightLong,
  faCalendarDays,
  faFlagCheckered,
  faPlus,
  faTrashCan,
} from "@fortawesome/free-solid-svg-icons";
import API from "../../api";
import { useToast } from "../../context/ToastContext";
import "../../styles/AdminSeasonRaces.css";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("de-CH");
}

function getApiErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback;
}

export default function AdminSeasonRaces() {
  const { seasonId } = useParams();
  const toast = useToast();
  const [season, setSeason] = useState(null);
  const [races, setRaces] = useState([]);
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const sortedRaces = useMemo(() => [...races], [races]);

  const fetchRaces = useCallback(
    async ({ showErrorToast = true } = {}) => {
      try {
        const raceRes = await API.get(`/races/season/${seasonId}`);
        setRaces(Array.isArray(raceRes.data) ? raceRes.data : []);
        return true;
      } catch (error) {
        console.error("Fehler beim Laden der Rennen:", error);
        if (showErrorToast) {
          toast.error("Rennen konnten nicht geladen werden.");
        }
        return false;
      }
    },
    [seasonId, toast],
  );

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [seasonRes, raceRes] = await Promise.all([
        API.get("/seasons"),
        API.get(`/races/season/${seasonId}`),
      ]);

      const seasons = Array.isArray(seasonRes.data) ? seasonRes.data : [];
      const foundSeason = seasons.find((entry) => entry._id === seasonId) || null;

      setSeason(foundSeason);
      setRaces(Array.isArray(raceRes.data) ? raceRes.data : []);

      if (!foundSeason) {
        toast.error("Season wurde nicht gefunden.");
      }
    } catch (error) {
      console.error("Fehler beim Laden:", error);
      toast.error("Daten konnten nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  }, [seasonId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addRace = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.info("Bitte einen Rennnamen eingeben.");
      return;
    }

    try {
      await API.post(`/races/season/${seasonId}`, { name: name.trim() });
      setName("");

      const refreshed = await fetchRaces({ showErrorToast: false });
      if (!refreshed) {
        toast.info(
          "Rennen wurde hinzugefügt, aber die Liste konnte nicht aktualisiert werden.",
        );
        return;
      }

      toast.success("Rennen wurde hinzugefügt.");
    } catch (error) {
      console.error("Fehler beim Hinzufügen:", error);
      toast.error(getApiErrorMessage(error, "Rennen konnte nicht hinzugefügt werden."));
    }
  };

  const deleteRace = async (race) => {
    if (!window.confirm(`Rennen "${race.name}" wirklich löschen?`)) return;

    try {
      await API.delete(`/races/${race._id}`);

      const refreshed = await fetchRaces({ showErrorToast: false });
      if (!refreshed) {
        toast.info(
          "Rennen wurde gelöscht, aber die Liste konnte nicht aktualisiert werden.",
        );
        return;
      }

      toast.success("Rennen wurde gelöscht.");
    } catch (error) {
      console.error("Fehler beim Löschen:", error);
      toast.error(getApiErrorMessage(error, "Rennen konnte nicht gelöscht werden."));
    }
  };

  return (
    <div className="admin-season-races-page">
      <header className="admin-season-races-header">
        <Link to="/admin/seasons" className="admin-season-races-back-link">
          Zurück zu den Seasons
        </Link>
        <h1>Rennen verwalten</h1>
        <p>
          {season ? (
            <>
              Season <strong>{season.name}</strong>
              {season.eventDate && (
                <>
                  {" "}
                  · Event-Datum: {formatDate(season.eventDate)}
                </>
              )}
            </>
          ) : (
            "Lade Season-Informationen…"
          )}
        </p>
      </header>

      <section className="admin-season-races-panel">
        <div className="admin-season-races-panel-head">
          <h2>Neues Rennen hinzufügen</h2>
        </div>

        <form className="admin-season-races-form" onSubmit={addRace}>
          <label className="admin-season-races-field">
            <span>
              <FontAwesomeIcon icon={faFlagCheckered} /> Name des Rennens
            </span>
            <input
              type="text"
              placeholder="z. B. Midnight Bay Circuit"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <div className="admin-season-races-form-actions">
            <button type="submit" className="admin-season-races-button">
              <FontAwesomeIcon icon={faPlus} /> Rennen hinzufügen
            </button>
          </div>
        </form>
      </section>

      <section className="admin-season-races-panel">
        <div className="admin-season-races-panel-head">
          <h2>Rennen</h2>
          <span className="admin-season-races-count">
            {races.length} {races.length === 1 ? "Eintrag" : "Einträge"}
          </span>
        </div>

        {isLoading ? (
          <p className="admin-season-races-state">Lade Rennen…</p>
        ) : sortedRaces.length === 0 ? (
          <p className="admin-season-races-state">Noch keine Rennen vorhanden.</p>
        ) : (
          <div className="admin-season-races-list">
            {sortedRaces.map((race) => (
              <article key={race._id} className="admin-race-card">
                <div className="admin-race-card-main">
                  <h3>{race.name}</h3>
                  <div className="admin-race-meta">
                    <span>
                      <FontAwesomeIcon icon={faCalendarDays} />
                      Season-Event: {formatDate(season?.eventDate)}
                    </span>
                  </div>
                </div>

                <div className="admin-race-actions">
                  <Link
                    to={`/admin/races/${race._id}/results`}
                    className="admin-season-races-action link"
                  >
                    <FontAwesomeIcon icon={faArrowRightLong} /> Ergebnisse
                  </Link>
                  <button
                    type="button"
                    className="admin-season-races-action danger"
                    onClick={() => deleteRace(race)}
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
