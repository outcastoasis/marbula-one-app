import { Link, useNavigate } from "react-router-dom";
import { useCallback, useContext, useEffect, useState } from "react";
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
  const [racesBySeason, setRacesBySeason] = useState({});
  const [loadingRacesSeasonId, setLoadingRacesSeasonId] = useState(null);
  const [expandedSeason, setExpandedSeason] = useState(null);
  const [showChooseTeamLink, setShowChooseTeamLink] = useState(false);

  const checkCurrentSeasonAssignment = useCallback(async () => {
    if (!user?._id) {
      setShowChooseTeamLink(false);
      return;
    }

    try {
      const currentSeasonRes = await API.get("/seasons/current");
      const currentSeason = currentSeasonRes.data;
      const currentSeasonId = currentSeason?._id;

      if (!currentSeasonId) {
        setShowChooseTeamLink(false);
        return;
      }

      const isSeasonParticipant = (currentSeason?.participants || []).some(
        (participant) => {
          const participantId =
            typeof participant === "object" ? participant?._id : participant;
          return participantId === user._id;
        },
      );

      if (!isSeasonParticipant) {
        setShowChooseTeamLink(false);
        return;
      }

      const assignmentsRes = await API.get(
        `/userSeasonTeams?season=${currentSeasonId}`,
      );
      const assignments = Array.isArray(assignmentsRes.data)
        ? assignmentsRes.data
        : [];

      const hasAssignment = assignments.some((assignment) => {
        const assignmentUserId =
          typeof assignment.user === "object"
            ? assignment.user?._id
            : assignment.user;
        return assignmentUserId === user._id;
      });

      setShowChooseTeamLink(!hasAssignment);
    } catch (error) {
      if (error?.response?.status !== 404) {
        console.error(
          "Fehler beim Prüfen der Teamzuweisung für die aktuelle Season:",
          error,
        );
      }
      setShowChooseTeamLink(false);
    }
  }, [user?._id]);

  useEffect(() => {
    const fetchSeasons = async () => {
      if (user?.role !== "admin") {
        setSeasons([]);
        setRacesBySeason({});
        return;
      }

      try {
        const res = await API.get("/seasons");
        setSeasons(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.error("Fehler beim Laden der Seasons:", error);
      }
    };

    fetchSeasons();
  }, [user?.role]);

  useEffect(() => {
    checkCurrentSeasonAssignment();
  }, [checkCurrentSeasonAssignment]);

  useEffect(() => {
    const handleTeamAssignmentUpdated = () => {
      checkCurrentSeasonAssignment();
    };

    window.addEventListener(
      "user-season-team-updated",
      handleTeamAssignmentUpdated,
    );

    return () => {
      window.removeEventListener(
        "user-season-team-updated",
        handleTeamAssignmentUpdated,
      );
    };
  }, [checkCurrentSeasonAssignment]);

  const handleSeasonToggle = useCallback(
    async (seasonId) => {
      const isExpanded = expandedSeason === seasonId;
      if (isExpanded) {
        setExpandedSeason(null);
        return;
      }

      setExpandedSeason(seasonId);

      if (racesBySeason[seasonId] !== undefined) {
        return;
      }

      setLoadingRacesSeasonId(seasonId);
      try {
        const racesRes = await API.get(`/races/season/${seasonId}`);
        const races = Array.isArray(racesRes.data) ? racesRes.data : [];
        setRacesBySeason((prev) => ({ ...prev, [seasonId]: races }));
      } catch (error) {
        console.error(`Fehler beim Laden der Rennen für Season ${seasonId}:`, error);
        setRacesBySeason((prev) => ({ ...prev, [seasonId]: [] }));
      } finally {
        setLoadingRacesSeasonId((prev) =>
          prev === seasonId ? null : prev,
        );
      }
    },
    [expandedSeason, racesBySeason],
  );

  const closeSidebar = () => setSidebarOpen(false);
  const displayName =
    typeof user?.realname === "string" && user.realname.trim()
      ? user.realname.trim()
      : user?.username;

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
          {user && showChooseTeamLink && (
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
                const seasonRaces = racesBySeason[season._id] || [];
                const isLoadingRaces = loadingRacesSeasonId === season._id;

                return (
                  <div key={season._id} className="season-group">
                    <button
                      type="button"
                      className="season-toggle"
                      aria-expanded={isExpanded}
                      aria-controls={`season-races-${season._id}`}
                      onClick={() => handleSeasonToggle(season._id)}
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
                        {isLoadingRaces ? (
                          <span>Lade Rennen...</span>
                        ) : seasonRaces.length > 0 ? (
                          seasonRaces.map((race) => (
                            <Link
                              key={race._id}
                              to={`/admin/races/${race._id}/results`}
                              onClick={closeSidebar}
                            >
                              {race.name}
                            </Link>
                          ))
                        ) : (
                          <span>Keine Rennen vorhanden</span>
                        )}
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
            <p>Hallo, {displayName}</p>
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

