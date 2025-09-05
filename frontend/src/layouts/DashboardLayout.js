// === DashboardLayout.js ===

import { Link, useNavigate, useLocation } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { Menu, X, ChevronDown, ChevronUp } from "lucide-react";
import API from "../api";
import "../styles.css";

export default function DashboardLayout({ children }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [seasons, setSeasons] = useState([]);
  const [expandedSeason, setExpandedSeason] = useState(null);

  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const res = await API.get("/seasons");
        const allSeasons = res.data;

        const seasonsWithRaces = await Promise.all(
          allSeasons.map(async (season) => {
            const racesRes = await API.get(`/races/season/${season._id}`);
            return { ...season, races: racesRes.data };
          })
        );

        setSeasons(seasonsWithRaces);
      } catch (error) {
        console.error("Fehler beim Laden der Seasons:", error);
      }
    };

    fetchSeasons();
  }, []);

  const isActive = (path) => location.pathname === path;

  return (
    <div className="layout">
      {/* Mobile Header */}
      <header className="mobile-header">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle Sidebar"
          className="icon-button"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h2 className="mobile-title">Marbula One</h2>
      </header>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div>
          <div className="sidebar-header">
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Close Sidebar"
              className="icon-button close-button"
            >
              <X size={24} />
            </button>
            <h2 className="sidebar-title">Marbula One</h2>
          </div>

          <nav className="nav">
            <Link
              to="/"
              className={isActive("/") ? "nav-link active" : "nav-link"}
              onClick={() => setSidebarOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/teams"
              className={isActive("/teams") ? "nav-link active" : "nav-link"}
              onClick={() => setSidebarOpen(false)}
            >
              Teams
            </Link>
            {user && !user.selectedTeam && (
              <Link
                to="/choose-team"
                className={
                  isActive("/choose-team") ? "nav-link active" : "nav-link"
                }
                onClick={() => setSidebarOpen(false)}
              >
                Team wählen
              </Link>
            )}

            {user?.role === "admin" && (
              <>
                <hr className="nav-divider" />
                <p className="nav-section-label">Admin</p>
                <Link
                  to="/admin/teams"
                  className={
                    isActive("/admin/teams") ? "nav-link active" : "nav-link"
                  }
                  onClick={() => setSidebarOpen(false)}
                >
                  Teams verwalten
                </Link>
                <Link
                  to="/admin/users"
                  className={
                    isActive("/admin/users") ? "nav-link active" : "nav-link"
                  }
                  onClick={() => setSidebarOpen(false)}
                >
                  Benutzer
                </Link>
                <Link
                  to="/admin/seasons"
                  className={
                    isActive("/admin/seasons") ? "nav-link active" : "nav-link"
                  }
                  onClick={() => setSidebarOpen(false)}
                >
                  Seasons
                </Link>
                {seasons.map((season) => (
                  <div key={season._id} className="nested-nav">
                    <button
                      className="nested-toggle"
                      onClick={() =>
                        setExpandedSeason((prev) =>
                          prev === season._id ? null : season._id
                        )
                      }
                    >
                      <span>{season.name}</span>
                      {expandedSeason === season._id ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>
                    {expandedSeason === season._id && (
                      <div className="nested-links">
                        {season.races.map((race) => (
                          <Link
                            key={race._id}
                            to={`/admin/races/${race._id}/results`}
                            className={
                              isActive(`/admin/races/${race._id}/results`)
                                ? "nav-sublink active"
                                : "nav-sublink"
                            }
                            onClick={() => setSidebarOpen(false)}
                          >
                            {race.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </nav>
        </div>

        {/* Footer */}
        {user && (
          <div className="sidebar-footer">
            <p className="sidebar-user">Hallo, {user.username}</p>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="logout-button"
            >
              Logout
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="main-content">{children}</main>
    </div>
  );
}
