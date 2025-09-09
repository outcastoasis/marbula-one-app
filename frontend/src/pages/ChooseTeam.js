import { useContext, useEffect, useState } from "react";
import API from "../api";
import { AuthContext } from "../context/AuthContext";
import "../styles/ChooseTeam.css";

export default function ChooseTeam() {
  const { user, login } = useContext(AuthContext);
  const [teams, setTeams] = useState([]);
  const [takenTeams, setTakenTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(user?.selectedTeam || null);

  useEffect(() => {
    const fetchData = async () => {
      const teamRes = await API.get("/teams");
      setTeams(teamRes.data);

      const allUsers = await API.get("/users");
      const taken = allUsers.data
        .map((u) => u.selectedTeam?._id)
        .filter((id) => id);
      setTakenTeams(taken);
    };
    fetchData();
  }, []);

  const selectTeam = async (teamId) => {
    try {
      const res = await API.put("/users/choose-team", { teamId });
      login(res.data.user);
      setSelectedTeam(res.data.user.selectedTeam);
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
            Du hast bereits ein Team gewählt:{" "}
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
