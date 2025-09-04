import { useEffect, useState } from 'react';
import API from '../../api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);

  const fetchData = async () => {
    const usersRes = await API.get('/users');
    const teamsRes = await API.get('/teams');
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
      alert(err.response?.data?.message || 'Fehler beim Zuweisen');
    }
  };

  const removeTeam = async (userId) => {
    await API.put(`/users/${userId}/team`, { teamId: null });
    fetchData();
  };

  return (
    <div className="w-full px-4 md:max-w-4xl md:mx-auto">
      <h2 className="text-2xl font-bold mb-6">Benutzerverwaltung</h2>

      <div className="overflow-x-auto rounded shadow border border-brand-border">
        <table className="min-w-[640px] table-auto w-full bg-brand-light text-brand-text">
          <thead>
            <tr className="bg-brand text-left">
              <th className="p-3 border-b border-brand-border">Benutzer</th>
              <th className="p-3 border-b border-brand-border">Email</th>
              <th className="p-3 border-b border-brand-border">Rolle</th>
              <th className="p-3 border-b border-brand-border">Team</th>
              <th className="p-3 border-b border-brand-border">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className="hover:bg-brand-dark">
                <td className="p-3 border-b border-brand-border">{u.username}</td>
                <td className="p-3 border-b border-brand-border">{u.email}</td>
                <td className="p-3 border-b border-brand-border">{u.role}</td>
                <td className="p-3 border-b border-brand-border">
                  {u.selectedTeam ? u.selectedTeam.name : <span className="text-gray-400">–</span>}
                </td>
                <td className="p-3 border-b border-brand-border space-y-2">
                  <select
                    value={u.selectedTeam?._id || ''}
                    onChange={(e) => handleTeamChange(u._id, e.target.value)}
                    className="w-full px-3 py-2 bg-brand-dark border border-brand-border rounded text-brand-text focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="">— Team wählen —</option>
                    {teams.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  {u.selectedTeam && (
                    <button
                      onClick={() => removeTeam(u._id)}
                      className="w-full text-left text-red-400 hover:text-red-600 text-sm"
                    >
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