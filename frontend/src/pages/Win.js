import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDown,
  faCalendarDays,
  faLocationDot,
  faNoteSticky,
  faTrophy,
} from "@fortawesome/free-solid-svg-icons";
import API from "../api";
import "../styles/Win.css";

const dateFormatter = new Intl.DateTimeFormat("de-CH", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatDate(dateValue) {
  if (!dateValue) {
    return "Unbekanntes Datum";
  }

  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime())
    ? "Unbekanntes Datum"
    : dateFormatter.format(parsed);
}

function formatRacer(user, team) {
  if (!user && !team) {
    return "Nicht erfasst";
  }

  if (!team) {
    return user;
  }

  if (!user) {
    return team;
  }

  return `${user} (${team})`;
}

export default function Win() {
  const [winners, setWinners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError("");
        const res = await API.get("/winners");
        setWinners(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Fehler beim Laden der Gewinner:", err);
        setError("Die Gewinner konnten nicht geladen werden.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const sortedWinners = useMemo(() => {
    return [...winners].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [winners]);

  return (
    <div className="win-page">
      <h1 className="win-page-title">Sieger-Archiv</h1>
      <p className="win-page-subtitle">
        Vergangene Event-Gewinner im Überblick
      </p>

      {isLoading && (
        <section className="win-empty-card">
          <p>Gewinner werden geladen...</p>
        </section>
      )}

      {!isLoading && error && (
        <section className="win-empty-card win-empty-card-error">
          <p>{error}</p>
        </section>
      )}

      {!isLoading && !error && sortedWinners.length === 0 && (
        <section className="win-empty-card">
          <p>Es sind noch keine Gewinner eingetragen.</p>
        </section>
      )}

      {!isLoading && !error && sortedWinners.length > 0 && (
        <div className="winner-list">
          {sortedWinners.map((winner, idx) => (
            <article
              className="winner-card"
              key={winner._id || `${winner.date}-${idx}`}
            >
              <header className="winner-card-header">
                <h2>
                  <FontAwesomeIcon icon={faCalendarDays} />
                  {formatDate(winner.date)}
                </h2>
                <p className="winner-location">
                  <FontAwesomeIcon icon={faLocationDot} />
                  {winner.location || "Unbekannter Ort"}
                </p>
              </header>

              <div className="winner-results-grid">
                <div className="winner-result winner-result-first">
                  <h3>
                    <FontAwesomeIcon icon={faTrophy} />
                    Gewinner
                  </h3>
                  <p>{formatRacer(winner.winnerUser, winner.winnerTeam)}</p>
                </div>

                <div className="winner-result winner-result-last">
                  <h3>
                    <FontAwesomeIcon icon={faArrowDown} />
                    Letzter Platz
                  </h3>
                  <p>
                    {formatRacer(winner.lastPlaceUser, winner.lastPlaceTeam)}
                  </p>
                </div>
              </div>

              {winner.notes && (
                <section className="winner-notes">
                  <h3>
                    <FontAwesomeIcon icon={faNoteSticky} />
                    Notizen
                  </h3>
                  <p>{winner.notes}</p>
                </section>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
