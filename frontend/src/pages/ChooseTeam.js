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

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!activeSeason) {
          return;
        }

        setTeams(activeSeason.teams || []);

        const res = await API.get(`/userSeasonTeams?season=${activeSeason._id}`);
        const allAssignments = res.data;

        setTakenTeams(allAssignments.map((assignment) => assignment.team._id));

        const mine = allAssignments.find(
          (assignment) => assignment.user._id === user._id,
        );
        setSelectedTeam(mine ? mine.team : null);
      } catch (err) {
        console.error("Fehler beim Laden", err);
      }
    };

    if (activeSeason) {
      fetchData();
    }
  }, [activeSeason, user?._id]);

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
      setTakenTeams((prev) => (prev.includes(teamId) ? prev : [...prev, teamId]));
      window.dispatchEvent(new Event("user-season-team-updated"));
      alert("Team erfolgreich gewählt!");
    } catch (err) {
      alert(err.response?.data?.message || "Fehler bei Teamwahl");
    }
  };

  return (
    <div className="choose-container">
      <h1 className="choose-page-title">Team auswählen</h1>
      <p className="choose-page-subtitle">
        Wähle dein Team
        {activeSeason?.name ? (
          <>
            {" "}
            für <strong>{activeSeason.name}</strong>
          </>
        ) : (
          " für die aktuelle Season"
        )}
      </p>

      {selectedTeam ? (
        <div className="selected-team-box">
          <p>
            Dein Team für {activeSeason?.name}: <strong>{selectedTeam.name}</strong>
          </p>
        </div>
      ) : (
        <div className="choose-grid">
          {teams.map((team) => (
            <div key={team._id} className="choose-card">
              <span className="choose-name">{team.name}</span>
              {takenTeams.includes(team._id) ? (
                <span className="choose-status">Vergeben</span>
              ) : (
                <button
                  type="button"
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
