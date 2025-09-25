import { useEffect, useState } from "react";
import API from "../api";
import { Link } from "react-router-dom";
import "../styles/Teams.css";

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [seasonName, setSeasonName] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const teamsRes = await API.get("/teams");
        setTeams(teamsRes.data);

        const seasonRes = await API.get("/seasons/current");
        setSeasonName(seasonRes.data?.name || "");

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

  const getTeamOwner = (teamId) => {
    const match = assignments.find((a) => a.team._id === teamId);
    return match?.user?.realname || null;
  };

  return (
    <div className="teams-container">
      <h2>Gewählte Teams in der{seasonName && <span> {seasonName}</span>}</h2>
      <div className="teams-grid">
        {teams.map((team) => (
          <Link
            key={team._id}
            to={`/teams/${team._id}`}
            className="team-card"
            style={{
              "--team-color": team.color || "#444",
              "--team-color-fade": `${team.color}22`,
            }}
          >
            {team.logoUrl && (
              <img
                src={team.logoUrl}
                alt={`${team.name} Logo`}
                className="team-logo"
              />
            )}
            <div className="team-info">
              <h3 className="team-name" style={{ color: team.color || "#fff" }}>
                {team.name}
              </h3>
              {getTeamOwner(team._id) && (
                <p className="team-owner">
                  Gewählt von: {getTeamOwner(team._id)}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
