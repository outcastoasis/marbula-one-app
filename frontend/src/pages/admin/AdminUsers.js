import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../api";
import "../../styles/AdminUsers.css";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
  }, []);

  const adminCount = useMemo(
    () => users.filter((user) => user.role === "admin").length,
    [users],
  );

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
          <h2>Benutzerliste</h2>
          <span className="admin-users-count">
            {users.length} {users.length === 1 ? "Eintrag" : "Einträge"}
          </span>
        </div>

        {isLoading ? (
          <p className="admin-users-state">Lade Benutzer…</p>
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
                    <td data-label="Name">{user.realname || "—"}</td>
                    <td data-label="Rolle">
                      <span
                        className={`role-badge ${user.role === "admin" ? "is-admin" : "is-user"}`}
                      >
                        {user.role === "admin" ? "Admin" : "User"}
                      </span>
                    </td>
                    <td data-label="Aktion">
                      <Link to={`/admin/users/${user._id}`} className="admin-users-action-link">
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
