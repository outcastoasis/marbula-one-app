import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import API from "../../api";
import { useToast } from "../../context/ToastContext";
import "../../styles/AdminUserEdit.css";

function getApiErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback;
}

export default function AdminUserEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [teams, setTeams] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [userRes, teamsRes, seasonsRes, assignmentsRes] = await Promise.all([
          API.get(`/users/${id}`),
          API.get("/teams"),
          API.get("/seasons"),
          API.get(`/userSeasonTeams/user/${id}`),
        ]);

        if (!ignore) {
          setUser(userRes.data);
          setTeams(teamsRes.data);
          setSeasons(seasonsRes.data);
          setAssignments(assignmentsRes.data);
          setRole(userRes.data.role);
        }
      } catch (error) {
        console.error("Fehler beim Laden:", error);
        if (!ignore) {
          toast.error("Daten konnten nicht geladen werden.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      ignore = true;
    };
  }, [id, toast]);

  const assignmentBySeasonId = useMemo(() => {
    const map = new Map();
    assignments.forEach((assignment) => {
      const seasonId =
        typeof assignment.season === "object"
          ? assignment.season?._id
          : assignment.season;
      if (seasonId) {
        map.set(seasonId, assignment);
      }
    });
    return map;
  }, [assignments]);

  const teamsById = useMemo(() => {
    const map = new Map();
    teams.forEach((team) => {
      if (team?._id) {
        map.set(team._id, team);
      }
    });
    return map;
  }, [teams]);

  const seasonTeamOptionsBySeasonId = useMemo(() => {
    const map = new Map();

    seasons.forEach((season) => {
      const seasonTeamIds = (season?.teams || [])
        .map((teamEntry) =>
          typeof teamEntry === "object" ? teamEntry?._id : teamEntry,
        )
        .filter(Boolean);

      const seasonTeams = seasonTeamIds
        .map((teamId) => teamsById.get(teamId))
        .filter(Boolean);

      map.set(season._id, seasonTeams);
    });

    return map;
  }, [seasons, teamsById]);

  const refreshAssignments = async () => {
    const updated = await API.get(`/userSeasonTeams/user/${id}`);
    setAssignments(updated.data);
  };

  const updateAssignment = async (seasonId, teamId) => {
    try {
      if (!teamId) {
        await API.delete("/userSeasonTeams", {
          data: { userId: id, seasonId },
        });
        toast.success("Teamzuweisung wurde entfernt.");
      } else {
        await API.post("/userSeasonTeams", {
          userId: id,
          seasonId,
          teamId,
        });
        toast.success("Teamzuweisung wurde gespeichert.");
      }

      await refreshAssignments();
    } catch (error) {
      const message =
        error.response?.data?.message ||
        (error.response?.status === 400
          ? "Ungültige Anfrage. Ist das Team schon vergeben?"
          : "Fehler beim Speichern oder Löschen.");
      toast.error(message);
    }
  };

  const updatePassword = async () => {
    if (!password.trim()) {
      toast.info("Bitte ein neues Passwort eingeben.");
      return;
    }

    try {
      await API.put(`/users/${id}/password`, { password });
      setPassword("");
      toast.success("Passwort wurde erfolgreich geändert.");
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Passwort konnte nicht geändert werden."),
      );
    }
  };

  const updateRole = async () => {
    if (!role) {
      toast.info("Bitte eine Rolle auswählen.");
      return;
    }

    if (user?.role === role) {
      toast.info("Die Rolle ist bereits gesetzt.");
      return;
    }

    try {
      await API.put(`/users/${id}/role`, { role });
      setUser((prev) => (prev ? { ...prev, role } : prev));
      toast.success("Rolle wurde erfolgreich aktualisiert.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Rolle konnte nicht aktualisiert werden."));
    }
  };

  const deleteUser = async () => {
    const confirmed = window.confirm("Willst du diesen Benutzer wirklich löschen?");
    if (!confirmed) return;

    try {
      await API.delete(`/users/${id}`);
      toast.success("Benutzer wurde gelöscht.");
      navigate("/admin/users");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Benutzer konnte nicht gelöscht werden."));
    }
  };

  if (isLoading) {
    return (
      <div className="admin-user-edit-page">
        <p className="admin-user-edit-state">Lade Daten…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="admin-user-edit-page">
        <p className="admin-user-edit-state">Benutzer wurde nicht gefunden.</p>
      </div>
    );
  }

  return (
    <div className="admin-user-edit-page">
      <header className="admin-user-edit-header">
        <Link to="/admin/users" className="admin-user-back-link">
          Zurück zur Benutzerliste
        </Link>
        <h1>Benutzer bearbeiten</h1>
        <p>Verwalte Teamzuweisungen, Rolle und Passwort dieses Benutzers.</p>
      </header>

      <section className="admin-user-edit-panel admin-user-meta-grid">
        <article className="admin-user-meta-card">
          <span>Benutzername</span>
          <strong>{user.username}</strong>
        </article>
        <article className="admin-user-meta-card">
          <span>Vollständiger Name</span>
          <strong>{user.realname || "—"}</strong>
        </article>
        <article className="admin-user-meta-card">
          <span>Aktuelle Rolle</span>
          <strong>{role === "admin" ? "Admin" : "User"}</strong>
        </article>
      </section>

      <section className="admin-user-edit-panel">
        <h2>Teams pro Season</h2>
        <div className="season-assignment-list">
          {seasons.map((season) => {
            const selected = assignmentBySeasonId.get(season._id);
            const seasonTeams = seasonTeamOptionsBySeasonId.get(season._id) || [];
            const selectedTeamId =
              typeof selected?.team === "object" ? selected?.team?._id : selected?.team;

            return (
              <article key={season._id} className="season-assignment-card">
                <div className="season-assignment-head">
                  <strong>{season.name}</strong>
                </div>
                <select
                  className="admin-user-control"
                  value={selectedTeamId || ""}
                  onChange={(event) => updateAssignment(season._id, event.target.value)}
                >
                  <option value="">— Team wählen —</option>
                  {seasonTeams.map((team) => (
                    <option key={team._id} value={team._id}>
                      {team.name}
                    </option>
                  ))}
                </select>
                {selected?.team && (
                  <button
                    type="button"
                    className="admin-button ghost"
                    onClick={() => updateAssignment(season._id, null)}
                  >
                    Team entfernen
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <div className="admin-user-edit-grid">
        <section className="admin-user-edit-panel">
          <h2>Passwort ändern</h2>
          <div className="admin-user-form-stack">
            <label htmlFor="new-password">Neues Passwort</label>
            <input
              id="new-password"
              className="admin-user-control"
              type="password"
              placeholder="Neues Passwort"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button type="button" className="admin-button" onClick={updatePassword}>
              Passwort speichern
            </button>
          </div>
        </section>

        <section className="admin-user-edit-panel">
          <h2>Rolle</h2>
          <div className="admin-user-form-stack">
            <label htmlFor="user-role">Rolle auswählen</label>
            <select
              id="user-role"
              className="admin-user-control"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <button type="button" className="admin-button" onClick={updateRole}>
              Rolle aktualisieren
            </button>
          </div>
        </section>
      </div>

      <section className="admin-user-edit-panel danger-zone">
        <h2>Gefahrenbereich</h2>
        <p>Dieser Vorgang entfernt den Benutzer dauerhaft.</p>
        <button type="button" className="admin-button danger" onClick={deleteUser}>
          Benutzer löschen
        </button>
      </section>
    </div>
  );
}
