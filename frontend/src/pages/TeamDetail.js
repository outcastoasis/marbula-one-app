import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCalendarDays,
  faCircleUser,
  faFileLines,
  faPalette,
  faTrophy,
} from "@fortawesome/free-solid-svg-icons";
import API from "../api";
import "../styles/TeamDetail.css";

function getTeamColorFade(color) {
  if (!color || typeof color !== "string") {
    return "rgba(255, 30, 30, 0.1)";
  }

  return color.startsWith("#") ? `${color}1f` : "rgba(255, 30, 30, 0.1)";
}

export default function TeamDetail() {
  const { id } = useParams();
  const [team, setTeam] = useState(null);
  const [owner, setOwner] = useState(null);
  const [seasonName, setSeasonName] = useState("");
  const [seasons, setSeasons] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const teamRes = await API.get(`/teams/${id}`);
        setTeam(teamRes.data);

        const seasonRes = await API.get("/seasons/current");
        setSeasonName(seasonRes.data?.name || "");

        const assignmentRes = await API.get(
          `/userSeasonTeams?season=${seasonRes.data._id}`
        );
        const matching = assignmentRes.data.find((entry) => entry.team._id === id);
        setOwner(matching?.user || null);

        const seasonListRes = await API.get(`/teams/${id}/seasons`);
        setSeasons(seasonListRes.data || []);
      } catch (err) {
        console.error("Fehler beim Laden der Team-Details:", err);
      }
    };

    fetchData();
  }, [id]);

  if (!team) {
    return (
      <div className="team-detail-page">
        <section className="team-detail-loading">Team wird geladen...</section>
      </div>
    );
  }

  const teamColor = team.color || "#ff1e1e";

  return (
    <div className="team-detail-page">
      <section
        className="team-detail-hero"
        style={{
          "--team-color": teamColor,
          "--team-color-fade": getTeamColorFade(teamColor),
        }}
      >
        <Link to="/teams" className="team-detail-back-link">
          <FontAwesomeIcon icon={faArrowLeft} />
          Zurück zu den Teams
        </Link>

        <div className="team-detail-hero-content">
          {team.logoUrl ? (
            <img
              src={team.logoUrl}
              alt={`${team.name} Logo`}
              className="team-detail-logo"
            />
          ) : (
            <div className="team-detail-logo team-detail-logo-fallback">
              <FontAwesomeIcon icon={faTrophy} />
            </div>
          )}

          <div className="team-detail-title-wrap">
            <h1 className="team-detail-name">{team.name}</h1>
            <p className="team-detail-subtitle">Teamprofil</p>
          </div>
        </div>
      </section>

      <section className="team-detail-grid">
        <article className="team-detail-panel">
          <h2>
            <FontAwesomeIcon icon={faCircleUser} />
            Besitzer
          </h2>
          <p className="team-detail-meta-line">
            {owner ? (
              <>
                <strong>{owner.realname}</strong>
                {seasonName ? ` (in ${seasonName})` : ""}
              </>
            ) : (
              "Aktuell keinem Nutzer zugewiesen."
            )}
          </p>

          <h2 className="team-detail-inline-title">
            <FontAwesomeIcon icon={faPalette} />
            Teamfarbe
          </h2>
          <p className="team-detail-meta-line">
            <span
              className="team-color-dot"
              style={{ backgroundColor: teamColor }}
              aria-hidden="true"
            />
            {teamColor}
          </p>
        </article>

        <article className="team-detail-panel">
          <h2>
            <FontAwesomeIcon icon={faFileLines} />
            Beschreibung
          </h2>
          <p className="team-detail-description">
            {team.description || "Keine Beschreibung verfügbar."}
          </p>
        </article>

        <article className="team-detail-panel team-detail-panel-seasons">
          <h2>
            <FontAwesomeIcon icon={faCalendarDays} />
            Seasons
          </h2>
          {seasons.length > 0 ? (
            <ul className="team-detail-season-list">
              {seasons.map((season) => (
                <li key={season._id}>
                  <FontAwesomeIcon icon={faTrophy} />
                  {season.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="team-detail-muted">
              Dieses Team hat bisher an keiner Season teilgenommen.
            </p>
          )}
        </article>
      </section>
    </div>
  );
}
