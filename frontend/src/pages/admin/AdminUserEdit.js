import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../../api";
import "../../styles/AdminUserEdit.css";

export default function AdminUserEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [teams, setTeams] = useState([]);
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");

  const reloadUser = async () => {
    try {
      const userRes = await API.get(`/users/${id}`);
      setUser(userRes.data);
      setRole(userRes.data.role);
    } catch (err) {
      console.error("Fehler beim Neuladen:", err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await API.get(`/users/${id}`);
        const teamsRes = await API.get("/teams");
        setUser(userRes.data);
        setTeams(teamsRes.data);
        setRole(userRes.data.role);
      } catch (err) {
        console.error("Fehler beim Laden:", err);
      }
    };

    fetchData();
  }, [id]);

  const updateTeam = async (teamId) => {
    await API.put(`/users/${id}/team`, { teamId });
    reloadUser();
  };

  const removeTeam = async () => {
    await API.put(`/users/${id}/team`, { teamId: null });
    reloadUser();
  };

  const updatePassword = async () => {
    if (!password) return alert("Kein Passwort eingegeben.");
    await API.put(`/users/${id}/password`, { password });
    alert("Passwort geändert");
    setPassword("");
  };

  const updateRole = async () => {
    await API.put(`/users/${id}/role`, { role });
    alert("Rolle aktualisiert");
    reloadUser();
  };

  const deleteUser = async () => {
    const confirm = window.confirm(
      "Willst du diesen Benutzer wirklich löschen?"
    );
    if (!confirm) return;

    await API.delete(`/users/${id}`);
    alert("Benutzer gelöscht");
    navigate("/admin/users");
  };

  if (!user) return <p>Lade Daten…</p>;

  return (
    <div className="admin-user-edit">
      <h2>Benutzer bearbeiten</h2>
      <p>
        <strong>Benutzername:</strong> {user.username}
      </p>
      <p>
        <strong>Vollständiger Name:</strong> {user.realname}
      </p>

      <div className="form-group">
        <label>Team ändern</label>
        <select
          value={user.selectedTeam?._id || ""}
          onChange={(e) => updateTeam(e.target.value)}
        >
          <option value="">— Team wählen —</option>
          {teams.map((t) => (
            <option key={t._id} value={t._id}>
              {t.name}
            </option>
          ))}
        </select>
        {user.selectedTeam && (
          <button onClick={removeTeam}>Team entfernen</button>
        )}
      </div>

      <div className="form-group">
        <label>Passwort ändern</label>
        <input
          type="password"
          placeholder="Neues Passwort"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button onClick={updatePassword}>Passwort speichern</button>
      </div>

      <div className="form-group">
        <label>Rolle</label>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <button onClick={updateRole}>Rolle aktualisieren</button>
      </div>

      <div className="form-group danger-zone">
        <button onClick={deleteUser} className="delete-button">
          Benutzer löschen
        </button>
      </div>
    </div>
  );
}
