import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightLong,
  faCircleUser,
  faFlagCheckered,
} from "@fortawesome/free-solid-svg-icons";
import API from "../api";
import "../styles/Teams.css";

function getTeamColorFade(color) {
  if (!color || typeof color !== "string") {
    return "rgba(255, 255, 255, 0.04)";
  }

  return color.startsWith("#") ? `${color}24` : "rgba(255, 255, 255, 0.04)";
}

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [seasonName, setSeasonName] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const seasonRes = await API.get("/seasons/current");
        setSeasonName(seasonRes.data?.name || "");
        setTeams(seasonRes.data?.teams || []);

        const assignmentRes = await API.get(
          `/userSeasonTeams?season=${seasonRes.data._id}`
        );
        setAssignments(assignmentRes.data);
      } catch (err) {
        console.error("Fehler beim Laden der Teams:", err);
      }
    };

    fetchData();
  }, []);

  const ownerByTeamId = useMemo(() => {
    const map = new Map();
    assignments.forEach((assignment) => {
      if (assignment?.team?._id) {
        map.set(assignment.team._id, assignment?.user?.realname || null);
      }
    });
    return map;
  }, [assignments]);

  return (
    <div className="teams-page">
      <h1 className="teams-page-title">Marbula One Teams</h1>
      <p className="teams-season-subtitle">
        Gewählte Teams
        {seasonName ? (
          <>
            {" "}
            in <strong>{seasonName}</strong>
          </>
        ) : (
          " in der aktuellen Season"
        )}
      </p>

      {teams.length === 0 ? (
        <section className="teams-empty-card">
          <p>Noch keine Teams für diese Season gefunden.</p>
        </section>
      ) : (
        <div className="teams-grid">
          {teams.map((team) => {
            const ownerName = ownerByTeamId.get(team._id);
            const teamColor = team.color || "#444444";

            return (
              <Link
                key={team._id}
                to={`/teams/${team._id}`}
                className="team-card"
                style={{
                  "--team-color": teamColor,
                  "--team-color-fade": getTeamColorFade(teamColor),
                }}
              >
                <article>
                  <div className="team-card-top">
                    {team.logoUrl ? (
                      <div className="team-logo-wrapper">
                        <img
                          src={team.logoUrl}
                          alt={`${team.name} Logo`}
                          className="team-logo"
                        />
                      </div>
                    ) : (
                      <div className="team-logo-fallback">
                        <FontAwesomeIcon icon={faFlagCheckered} />
                      </div>
                    )}

                    <h2 className="team-name">{team.name}</h2>
                  </div>

                  <div className="team-card-bottom">
                    <p className="team-owner">
                      <FontAwesomeIcon icon={faCircleUser} />
                      {ownerName
                        ? `Gewählt von: ${ownerName}`
                        : "Noch nicht gewählt"}
                    </p>
                    <span className="team-detail-link">
                      Details
                      <FontAwesomeIcon icon={faArrowRightLong} />
                    </span>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
