// === AdminTeams.js mit verschönertem Edit-Modus ===
import { useEffect, useState } from "react";
import API from "../../api";
import "../../styles/AdminTeams.css";

export default function AdminTeams() {
  const [teams, setTeams] = useState([]);
  const [newTeam, setNewTeam] = useState({ name: "", color: "", logoUrl: "" });
  const [editTeamId, setEditTeamId] = useState(null);
  const [editTeamData, setEditTeamData] = useState({
    name: "",
    color: "",
    logoUrl: "",
  });

  const fetchTeams = async () => {
    const res = await API.get("/teams");
    setTeams(res.data);
  };

  const addTeam = async () => {
    if (!newTeam.name.trim()) return;
    await API.post("/teams", newTeam);
    setNewTeam({ name: "", color: "", logoUrl: "" });
    fetchTeams();
  };

  const deleteTeam = async (id) => {
    if (window.confirm("Team wirklich löschen?")) {
      await API.delete(`/teams/${id}`);
      fetchTeams();
    }
  };

  const startEdit = (team) => {
    setEditTeamId(team._id);
    setEditTeamData({
      name: team.name,
      color: team.color || "",
      logoUrl: team.logoUrl || "",
    });
  };

  const cancelEdit = () => {
    setEditTeamId(null);
    setEditTeamData({ name: "", color: "", logoUrl: "" });
  };

  const saveEdit = async () => {
    await API.put(`/teams/${editTeamId}`, editTeamData);
    cancelEdit();
    fetchTeams();
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
          value={newTeam.name}
          onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
        />

        <label>Teamfarbe (Hexcode)</label>
        <input
          type="text"
          placeholder="#ff0000"
          value={newTeam.color}
          onChange={(e) => setNewTeam({ ...newTeam, color: e.target.value })}
        />

        <label>Logo-URL</label>
        <input
          type="text"
          placeholder="https://..."
          value={newTeam.logoUrl}
          onChange={(e) => setNewTeam({ ...newTeam, logoUrl: e.target.value })}
        />

        <button onClick={addTeam}>Team hinzufügen</button>
      </div>

      <div className="team-list">
        {teams.map((team) => (
          <div key={team._id} className="team-item">
            {editTeamId === team._id ? (
              <div className="edit-fields">
                <input
                  className="team-edit-input"
                  value={editTeamData.name}
                  onChange={(e) =>
                    setEditTeamData({ ...editTeamData, name: e.target.value })
                  }
                />
                <input
                  className="team-edit-input"
                  value={editTeamData.color}
                  onChange={(e) =>
                    setEditTeamData({ ...editTeamData, color: e.target.value })
                  }
                />
                <input
                  className="team-edit-input"
                  value={editTeamData.logoUrl}
                  onChange={(e) =>
                    setEditTeamData({
                      ...editTeamData,
                      logoUrl: e.target.value,
                    })
                  }
                />
                <div className="team-actions">
                  <button onClick={saveEdit}>💾</button>
                  <button onClick={cancelEdit}>✖</button>
                </div>
              </div>
            ) : (
              <>
                <span>{team.name}</span>
                {team.color && (
                  <span className="team-color-text">{team.color}</span>
                )}
                {team.logoUrl && (
                  <img
                    src={team.logoUrl}
                    alt="Logo"
                    className="team-logo-small"
                  />
                )}
                <div className="team-actions">
                  <button onClick={() => startEdit(team)}>🖉</button>
                  <button onClick={() => deleteTeam(team._id)}>🗑️</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
