import { useEffect, useState } from "react";
import API from "../api";
import "../styles/Teams.css";

export default function Teams() {
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    API.get("/teams")
      .then((res) => setTeams(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="teams-container">
      <h2>Alle Teams</h2>

      <div className="teams-list">
        {teams.map((team) => (
          <div key={team._id} className="team-item">
            <span className="team-name">{team.name}</span>
            {team.color && <span className="team-color">{team.color}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
