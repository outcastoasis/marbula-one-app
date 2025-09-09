// === Neue Datei: src/pages/Teams.js ===
import { useEffect, useState } from "react";
import API from "../api";
import { Link } from "react-router-dom";
import "../styles/Teams.css";

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const teamsRes = await API.get("/teams");
      const usersRes = await API.get("/users");
      setTeams(teamsRes.data);
      setUsers(usersRes.data);
    };

    fetchData();
  }, []);

  const getTeamOwner = (teamId) => {
    const user = users.find((u) => u.selectedTeam?._id === teamId);
    return user ? user.realname : null;
  };

  return (
    <div className="teams-container">
      <h2>Alle Teams</h2>
      <div className="teams-grid">
        {teams.map((team) => (
          <Link
            key={team._id}
            to={`/teams/${team._id}`}
            className="team-card"
            style={{
              borderColor: team.color || "#444",
              background: team.color
                ? `radial-gradient(circle at center, ${team.color}22 0%, var(--brand-light) 80%)`
                : undefined,
              boxShadow: team.color
                ? `inset 0 0 20px ${team.color}88`
                : "inset 0 0 20px #444",
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
