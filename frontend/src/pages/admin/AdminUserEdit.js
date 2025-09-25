import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../../api";
import "../../styles/AdminUserEdit.css";

export default function AdminUserEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [teams, setTeams] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, teamsRes, seasonsRes, assignmentsRes] =
          await Promise.all([
            API.get(`/users/${id}`),
            API.get("/teams"),
            API.get("/seasons"),
            API.get(`/userSeasonTeams/user/${id}`),
          ]);

        setUser(userRes.data);
        setTeams(teamsRes.data);
        setSeasons(seasonsRes.data);
        setAssignments(assignmentsRes.data);
        setRole(userRes.data.role);
      } catch (err) {
        console.error("Fehler beim Laden:", err);
      }
    };

    fetchData();
  }, [id]);

  const updateAssignment = async (seasonId, teamId) => {
    try {
      if (!teamId) {
        await API.delete(`/userSeasonTeams`, {
          data: { userId: id, seasonId },
        });
      } else {
        await API.post("/userSeasonTeams", {
          userId: id,
          seasonId,
          teamId,
        });
      }

      const updated = await API.get(`/userSeasonTeams/user/${id}`);
      setAssignments(updated.data);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        (err.response?.status === 400
          ? "Ungültige Anfrage – ist das Team schon vergeben?"
          : "Fehler beim Speichern/Löschen");

      alert(message);
    }
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
        <label>Teams pro Season</label>
        {seasons.map((season) => {
          const selected = assignments.find((a) => a.season._id === season._id);
          return (
            <div key={season._id} className="season-assignment">
              <strong>{season.name}</strong>
              <select
                value={selected?.team?._id || ""}
                onChange={(e) => updateAssignment(season._id, e.target.value)}
              >
                <option value="">— Team wählen —</option>
                {teams.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {selected?.team && (
                <button
                  className="delete-button"
                  onClick={() => updateAssignment(season._id, null)}
                >
                  Team entfernen
                </button>
              )}
            </div>
          );
        })}
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
