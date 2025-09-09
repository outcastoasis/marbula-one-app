// === DashboardLayout.js ===

import { Link, useNavigate } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { Menu, X, ChevronDown, ChevronUp } from "lucide-react";
import API from "../api";
import "../styles/DashboardLayout.css";
import navbarLogo from "../assets/navbar_2.png";

export default function DashboardLayout({ children }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
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

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="dashboard-layout">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        {sidebarOpen && (
          <button
            className="sidebar-close"
            onClick={closeSidebar}
            aria-label="Sidebar schliessen"
          >
            <X size={24} />
          </button>
        )}
        <h2>Marbula One</h2>

        <nav>
          <Link to="/" onClick={closeSidebar}>
            Home
          </Link>
          <Link to="/teams" onClick={closeSidebar}>
            Teams
          </Link>
          <Link to="/winners" onClick={closeSidebar}>
            Siegerarchiv
          </Link>
          {user && !user.selectedTeam && (
            <Link to="/choose-team" onClick={closeSidebar}>
              Team wählen
            </Link>
          )}

          {user?.role === "admin" && (
            <>
              <hr />
              <p>Admin</p>
              <Link to="/admin/teams" onClick={closeSidebar}>
                Teams verwalten
              </Link>
              <Link to="/admin/users" onClick={closeSidebar}>
                Benutzer verwalten
              </Link>
              <Link to="/admin/winners" onClick={closeSidebar}>
                Event-Sieger eintragen
              </Link>
              <Link to="/admin/seasons" onClick={closeSidebar}>
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
                          onClick={closeSidebar}
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
      </aside>

      <header className="dashboard-header">
        <div className="dashboard-header-inner">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <img src={navbarLogo} alt="Marbula One" className="header-logo" />
        </div>
      </header>

      <main className="dashboard-main">{children}</main>
    </div>
  );
}
