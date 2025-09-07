import { useEffect, useState } from "react";
import API from "../../api";
import "../../styles/AdminTeams.css";

export default function AdminTeams() {
  const [teams, setTeams] = useState([]);
  const [newName, setNewName] = useState("");

  const fetchTeams = async () => {
    const res = await API.get("/teams");
    setTeams(res.data);
  };

  const addTeam = async () => {
    if (!newName.trim()) return;
    await API.post("/teams", { name: newName });
    setNewName("");
    fetchTeams();
  };

  const deleteTeam = async (id) => {
    if (window.confirm("Team wirklich löschen?")) {
      await API.delete(`/teams/${id}`);
      fetchTeams();
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  return (
    <div className="admin-teams-container">
      <h2>Teams verwalten</h2>

      <div className="team-form">
        <label>Teamname</label>
        <input
          placeholder="z. B. Raspberry Racers"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button onClick={addTeam}>Team hinzufügen</button>
      </div>

      <div className="team-list">
        {teams.map((team) => (
          <div key={team._id} className="team-item">
            <span>{team.name}</span>
            <button onClick={() => deleteTeam(team._id)}>🗑️</button>
          </div>
        ))}
      </div>
    </div>
  );
}
