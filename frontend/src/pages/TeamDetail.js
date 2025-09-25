import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../api";
import "../styles/TeamDetail.css";

export default function TeamDetail() {
  const { id } = useParams();
  const [team, setTeam] = useState(null);
  const [owner, setOwner] = useState(null);
  const [seasonName, setSeasonName] = useState("");

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

        const matching = assignmentRes.data.find((a) => a.team._id === id);
        setOwner(matching?.user || null);
      } catch (err) {
        console.error("Fehler beim Laden der Team-Details:", err);
      }
    };

    fetchData();
  }, [id]);

  if (!team) return <p className="team-loading">⏳ Team wird geladen...</p>;

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

        {owner && (
          <p className="team-detail-owner">
            Gewählt von: <strong>{owner.realname}</strong>
            {seasonName && ` (in ${seasonName})`}
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
