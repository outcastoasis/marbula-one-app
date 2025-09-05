// === DashboardLayout.js ===

import { Link, useNavigate, useLocation } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { Menu, X, ChevronDown, ChevronUp } from "lucide-react";
import API from "../api";
import "../styles/DashboardLayout.css";

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
    <div>
      <header className="dashboard-header">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle Sidebar"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h2>Marbula One</h2>
      </header>

      {/* Sidebar-Overlay, links ausfahrbar */}
      <aside
        className={`sidebar-overlay ${
          sidebarOpen ? "sidebar-visible" : "sidebar-hidden"
        }`}
      >
        <div className="sidebar">
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close Sidebar"
          >
            <X size={24} />
          </button>

          <h2>Marbula One</h2>

          <nav>
            <Link to="/" onClick={() => setSidebarOpen(false)}>
              Home
            </Link>
            <Link to="/teams" onClick={() => setSidebarOpen(false)}>
              Teams
            </Link>
            {user && !user.selectedTeam && (
              <Link to="/choose-team" onClick={() => setSidebarOpen(false)}>
                Team wählen
              </Link>
            )}

            {user?.role === "admin" && (
              <>
                <hr />
                <p>Admin</p>
                <Link to="/admin/teams" onClick={() => setSidebarOpen(false)}>
                  Teams verwalten
                </Link>
                <Link to="/admin/users" onClick={() => setSidebarOpen(false)}>
                  Benutzer
                </Link>
                <Link to="/admin/seasons" onClick={() => setSidebarOpen(false)}>
                  Seasons
                </Link>
                {seasons.map((season) => (
                  <div key={season._id}>
                    <button
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
                      <div>
                        {season.races.map((race) => (
                          <Link
                            key={race._id}
                            to={`/admin/races/${race._id}/results`}
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

          {user && (
            <div style={{ marginTop: "1rem" }}>
              <p>Hallo, {user.username}</p>
              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      <main>{children}</main>
    </div>
  );
}
