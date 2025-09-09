// === Neue Datei: src/pages/TeamDetail.js ===
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../api";
import "../styles/Teams.css";

export default function TeamDetail() {
  const { id } = useParams();
  const [team, setTeam] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const teamRes = await API.get(`/teams`);
      const foundTeam = teamRes.data.find((t) => t._id === id);
      setTeam(foundTeam);

      const usersRes = await API.get("/users");
      setUsers(usersRes.data);
    };

    fetchData();
  }, [id]);

  if (!team) return <p>⏳ Team wird geladen...</p>;

  const user = users.find((u) => u.selectedTeam?._id === team._id);

  return (
    <div className="teams-container">
      <h2>{team.name}</h2>
      {team.logoUrl && (
        <img
          src={team.logoUrl}
          alt={`${team.name} Logo`}
          className="team-logo"
          style={{ margin: "1rem auto" }}
        />
      )}
      <p style={{ color: team.color || "#fff" }}>
        Teamfarbe: {team.color || "n/a"}
      </p>
      {user && <p>Gewählt von: {user.username}</p>}
      <p className="team-description">
        {/* Kurze Beschreibung als Platzhalter */}
        Dieses Team ist eines der traditionsreichsten in der Geschichte der
        Marbula One und bekannt für seine unverwechselbare Dynamik.
      </p>
    </div>
  );
}
