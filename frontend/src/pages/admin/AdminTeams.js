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
    if (window.confirm("Team wirklich löschen?")) {
      await API.delete(`/teams/${id}`);
      fetchTeams();
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Teams verwalten</h2>

      <div className="bg-brand-light p-6 rounded-lg shadow space-y-4 mb-10">
        <div>
          <label className="block text-sm mb-1">Teamname</label>
          <input
            placeholder="z. B. Raspberry Racers"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-4 py-2 bg-brand-dark border border-brand-border text-brand-text rounded focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <button
          onClick={addTeam}
          className="bg-brand text-white font-semibold py-2 px-4 rounded hover:bg-red-600 transition"
        >
          Team hinzufügen
        </button>
      </div>

      <div className="space-y-4">
        {teams.map((team) => (
          <div
            key={team._id}
            className="bg-brand-light p-4 rounded-lg shadow flex justify-between items-center"
          >
            <span className="font-medium text-brand-text">{team.name}</span>
            <button
              onClick={() => deleteTeam(team._id)}
              className="text-red-500 hover:text-red-700"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}