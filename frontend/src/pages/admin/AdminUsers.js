import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../api";
import { useToast } from "../../context/ToastContext";
import "../../styles/AdminUsers.css";

function getApiErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback;
}

export default function AdminUsers() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [realname, setRealname] = useState("");
  const [password, setPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    let ignore = false;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const usersRes = await API.get("/users");
        if (!ignore) {
          setUsers(usersRes.data);
        }
      } catch (error) {
        console.error("Fehler beim Laden der Benutzer:", error);
        if (!ignore) {
          toast.error("Benutzer konnten nicht geladen werden.");
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
  }, [toast]);

  const adminCount = useMemo(
    () => users.filter((user) => user.role === "admin").length,
    [users],
  );

  const createUser = async (event) => {
    event.preventDefault();

    const trimmedUsername = username.trim();
    const trimmedRealname = realname.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedRealname || !trimmedPassword) {
      toast.info("Bitte Benutzername, Name und Passwort ausfüllen.");
      return;
    }

    try {
      setIsCreating(true);

      const response = await API.post("/users", {
        username: trimmedUsername,
        realname: trimmedRealname,
        password: trimmedPassword,
      });

      if (response.data?.user) {
        setUsers((previousUsers) => [...previousUsers, response.data.user]);
      }

      setUsername("");
      setRealname("");
      setPassword("");
      toast.success("Benutzer wurde erstellt.");
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Benutzer konnte nicht erstellt werden."),
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="admin-users-page">
      <header className="admin-users-header">
        <h1>Benutzerverwaltung</h1>
        <p>Verwalte Rollen und öffne Benutzerprofile zur Detailbearbeitung.</p>
      </header>

      <section className="admin-users-panel admin-users-stats">
        <article className="admin-users-stat-card">
          <span>Gesamt</span>
          <strong>{users.length}</strong>
        </article>
        <article className="admin-users-stat-card">
          <span>Admins</span>
          <strong>{adminCount}</strong>
        </article>
        <article className="admin-users-stat-card">
          <span>Benutzer</span>
          <strong>{Math.max(users.length - adminCount, 0)}</strong>
        </article>
      </section>

      <section className="admin-users-panel">
        <div className="admin-users-table-head">
          <h2>Neuen Benutzer erstellen</h2>
        </div>

        <form className="admin-users-create-form" onSubmit={createUser}>
          <label htmlFor="create-username">Benutzername</label>
          <input
            id="create-username"
            className="admin-users-control"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Benutzername"
            autoComplete="off"
          />

          <label htmlFor="create-realname">Name</label>
          <input
            id="create-realname"
            className="admin-users-control"
            type="text"
            value={realname}
            onChange={(event) => setRealname(event.target.value)}
            placeholder="Vorname Nachname"
            autoComplete="off"
          />

          <label htmlFor="create-password">Passwort</label>
          <input
            id="create-password"
            className="admin-users-control"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Passwort"
            autoComplete="new-password"
          />

          <button
            type="submit"
            className="admin-users-create-button"
            disabled={isCreating}
          >
            {isCreating ? "Erstelle..." : "Benutzer erstellen"}
          </button>
        </form>
      </section>

      <section className="admin-users-panel">
        <div className="admin-users-table-head">
          <h2>Benutzerliste</h2>
          <span className="admin-users-count">
            {users.length} {users.length === 1 ? "Eintrag" : "Einträge"}
          </span>
        </div>

        {isLoading ? (
          <p className="admin-users-state">Lade Benutzer...</p>
        ) : users.length === 0 ? (
          <p className="admin-users-state">Keine Benutzer gefunden.</p>
        ) : (
          <div className="admin-users-table-wrapper">
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th>Benutzername</th>
                  <th>Name</th>
                  <th>Rolle</th>
                  <th>Aktion</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td data-label="Benutzername">{user.username}</td>
                    <td data-label="Name">{user.realname || "-"}</td>
                    <td data-label="Rolle">
                      <span
                        className={`role-badge ${user.role === "admin" ? "is-admin" : "is-user"}`}
                      >
                        {user.role === "admin" ? "Admin" : "User"}
                      </span>
                    </td>
                    <td data-label="Aktion">
                      <Link
                        to={`/admin/users/${user._id}`}
                        className="admin-users-action-link"
                      >
                        Bearbeiten
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
