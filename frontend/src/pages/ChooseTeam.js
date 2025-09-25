import { useContext, useEffect, useState } from "react";
import API from "../api";
import { AuthContext } from "../context/AuthContext";
import "../styles/ChooseTeam.css";

export default function ChooseTeam() {
  const { user } = useContext(AuthContext);
  const [teams, setTeams] = useState([]);
  const [takenTeams, setTakenTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [activeSeason, setActiveSeason] = useState(null);

  // Aktive Season laden
  useEffect(() => {
    const fetchActiveSeason = async () => {
      try {
        const res = await API.get("/seasons/current");
        setActiveSeason(res.data);
      } catch (err) {
        console.error("Fehler beim Laden der aktiven Season", err);
      }
    };
    fetchActiveSeason();
  }, []);

  // Teams + bereits gewählte Zuordnungen laden
  useEffect(() => {
    const fetchData = async () => {
      try {
        const teamRes = await API.get("/teams");
        setTeams(teamRes.data);

        if (activeSeason) {
          const res = await API.get(
            `/userSeasonTeams?season=${activeSeason._id}`
          );
          const allAssignments = res.data;

          setTakenTeams(allAssignments.map((a) => a.team._id));

          // Prüfen, ob User schon gewählt hat
          const mine = allAssignments.find((a) => a.user._id === user._id);
          if (mine) setSelectedTeam(mine.team);
        }
      } catch (err) {
        console.error("Fehler beim Laden", err);
      }
    };
    fetchData();
  }, [activeSeason, user]);

  const selectTeam = async (teamId) => {
    if (!activeSeason) {
      alert("Keine aktive Season gefunden");
      return;
    }
    try {
      const res = await API.post("/userSeasonTeams", {
        teamId,
        seasonId: activeSeason._id,
      });
      setSelectedTeam(res.data.team);
      alert("Team erfolgreich gewählt!");
    } catch (err) {
      alert(err.response?.data?.message || "Fehler bei Teamwahl");
    }
  };

  return (
    <div className="choose-container">
      <h2>Team auswählen</h2>

      {selectedTeam ? (
        <div className="selected-team-box">
          <p>
            Dein Team für {activeSeason?.name}:{" "}
            <strong>{selectedTeam.name}</strong>
          </p>
        </div>
      ) : (
        <div className="choose-grid">
          {teams.map((team) => (
            <div key={team._id} className="choose-card">
              <span className="choose-name">{team.name}</span>
              {takenTeams.includes(team._id) ? (
                <span className="choose-status">vergeben</span>
              ) : (
                <button
                  onClick={() => selectTeam(team._id)}
                  className="choose-select-btn"
                >
                  Wählen
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
