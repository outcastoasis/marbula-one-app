import { useEffect, useState } from "react";
import API from "../../api";
import "../../styles/AdminUsers.css";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);

  const fetchData = async () => {
    const usersRes = await API.get("/users");
    const teamsRes = await API.get("/teams");
    setUsers(usersRes.data);
    setTeams(teamsRes.data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTeamChange = async (userId, teamId) => {
    try {
      await API.put(`/users/${userId}/team`, { teamId });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Fehler beim Zuweisen");
    }
  };

  const removeTeam = async (userId) => {
    await API.put(`/users/${userId}/team`, { teamId: null });
    fetchData();
  };

  return (
    <div className="admin-users-container">
      <h2>Benutzerverwaltung</h2>

      <div className="table-wrapper">
        <table className="admin-users-table">
          <thead>
            <tr>
              <th>Benutzer</th>
              <th>Email</th>
              <th>Rolle</th>
              <th>Team</th>
              <th>Team anpassen</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.selectedTeam ? u.selectedTeam.name : "–"}</td>
                <td>
                  <select
                    value={u.selectedTeam?._id || ""}
                    onChange={(e) => handleTeamChange(u._id, e.target.value)}
                  >
                    <option value="">— Team wählen —</option>
                    {teams.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  {u.selectedTeam && (
                    <button onClick={() => removeTeam(u._id)}>
                      🗑️ Entfernen
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
