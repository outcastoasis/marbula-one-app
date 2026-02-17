import { Link, useNavigate } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faChevronDown,
  faChevronUp,
  faFlagCheckered,
  faHouse,
  faTrophy,
  faUsers,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { AuthContext } from "../context/AuthContext";
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
          }),
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
      <aside
        id="dashboard-sidebar"
        className={`sidebar ${sidebarOpen ? "open" : ""}`}
      >
        {sidebarOpen && (
          <button
            type="button"
            className="sidebar-close"
            onClick={closeSidebar}
            aria-label="Sidebar schliessen"
          >
            <FontAwesomeIcon icon={faXmark} size="lg" />
          </button>
        )}
        <h2>Marbula One</h2>

        <nav aria-label="Hauptnavigation">
          <Link to="/" onClick={closeSidebar}>
            <FontAwesomeIcon icon={faHouse} /> Home
          </Link>
          <Link to="/teams" onClick={closeSidebar}>
            <FontAwesomeIcon icon={faUsers} /> Teams
          </Link>
          <Link to="/winners" onClick={closeSidebar}>
            <FontAwesomeIcon icon={faTrophy} /> Sieger-Archiv
          </Link>
          {user && !user.selectedTeam && (
            <Link to="/choose-team" onClick={closeSidebar}>
              <FontAwesomeIcon icon={faFlagCheckered} /> Team wählen
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

              {seasons.map((season) => {
                const isExpanded = expandedSeason === season._id;

                return (
                  <div key={season._id} className="season-group">
                    <button
                      type="button"
                      className="season-toggle"
                      aria-expanded={isExpanded}
                      aria-controls={`season-races-${season._id}`}
                      onClick={() =>
                        setExpandedSeason((prev) =>
                          prev === season._id ? null : season._id,
                        )
                      }
                    >
                      <span>{season.name}</span>
                      <FontAwesomeIcon
                        icon={isExpanded ? faChevronUp : faChevronDown}
                        size="sm"
                      />
                    </button>
                    {isExpanded && (
                      <div
                        id={`season-races-${season._id}`}
                        className="race-links"
                      >
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
                );
              })}
            </>
          )}
        </nav>

        {user && (
          <div className="sidebar-user-section">
            <p>Hallo, {user.username}</p>
            <button
              type="button"
              className="logout-button"
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
          <button
            type="button"
            className="dashboard-menu-toggle"
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-label={sidebarOpen ? "Sidebar schliessen" : "Sidebar öffnen"}
            aria-expanded={sidebarOpen}
            aria-controls="dashboard-sidebar"
          >
            <FontAwesomeIcon icon={sidebarOpen ? faXmark : faBars} size="lg" />
          </button>
          <Link to="/" className="header-logo-link" aria-label="Zur Startseite">
            <img src={navbarLogo} alt="Marbula One" className="header-logo" />
          </Link>
        </div>
      </header>

      <main className="dashboard-main">{children}</main>
    </div>
  );
}
