import { useEffect, useState } from "react";
import API from "../../api";

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
    await API.delete(`/teams/${id}`);
    fetchTeams();
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  return (
    <div>
      <h2>Teamverwaltung</h2>

      <input
        placeholder="Teamname"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
      />
      <button onClick={addTeam}>Hinzufügen</button>

      <ul>
        {teams.map((team) => (
          <li key={team._id}>
            {team.name} <button onClick={() => deleteTeam(team._id)}>🗑️</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
