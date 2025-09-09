import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../api";
import "../styles/TeamDetail.css";

export default function TeamDetail() {
  const { id } = useParams();
  const [team, setTeam] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const [teamRes, usersRes] = await Promise.all([
        API.get("/teams"),
        API.get("/users"),
      ]);

      const foundTeam = teamRes.data.find((t) => t._id === id);
      setTeam(foundTeam);
      setUsers(usersRes.data);
    };

    fetchData();
  }, [id]);

  if (!team) return <p className="team-loading">⏳ Team wird geladen...</p>;

  const user = users.find((u) => u.selectedTeam?._id === team._id);

  return (
    <div className="team-detail-container">
      <div
        className="team-detail-card"
        style={{ "--team-color": team.color || "#ff1e1e" }}
      >
        {team.logoUrl && (
          <img
            src={team.logoUrl}
            alt={`${team.name} Logo`}
            className="team-detail-logo"
          />
        )}

        <h2 className="team-detail-name">{team.name}</h2>

        {user && (
          <p className="team-detail-owner">
            Gewählt von: <strong>{user.realname}</strong>
          </p>
        )}

        {team.color && (
          <p className="team-detail-color">
            Teamfarbe: <span style={{ color: team.color }}>{team.color}</span>
          </p>
        )}

        {team.description && (
          <div className="team-detail-description">
            <h3>Beschreibung</h3>
            <p>{team.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
