import { Link, useNavigate, useLocation } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { Menu, X, ChevronDown, ChevronUp } from "lucide-react";
import API from "../api";

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
    <div className="flex min-h-screen bg-brand-dark font-sans text-brand-text">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-brand-light flex items-center px-4 py-3 shadow">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle Sidebar"
          className="text-brand-text"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h2 className="ml-auto text-lg font-bold text-brand-text">
          Marbula One
        </h2>
      </div>

      {/* Sidebar (Mobile + Desktop) */}
      <aside
        className={`fixed z-50 md:static top-0 left-0 h-full md:min-h-screen w-64 bg-brand-light shadow-md p-4 transform transition-transform duration-300 ease-in-out flex flex-col justify-between
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        <div>
          {/* Schliessen Button auf Mobile */}
          <div className="md:hidden flex justify-end mb-4">
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Close Sidebar"
            >
              <X size={24} />
            </button>
          </div>

          <h2 className="text-xl font-bold mb-6 text-brand-text hidden md:block">
            Marbula One
          </h2>
          <nav className="space-y-2">
            <Link
              to="/"
              className={`block hover:text-brand ${isActive("/") ? "text-brand font-semibold" : ""}`}
              onClick={() => setSidebarOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/teams"
              className={`block hover:text-brand ${isActive("/teams") ? "text-brand font-semibold" : ""}`}
              onClick={() => setSidebarOpen(false)}
            >
              Teams
            </Link>
            {user && !user.selectedTeam && (
              <Link
                to="/choose-team"
                className={`block hover:text-brand ${isActive("/choose-team") ? "text-brand font-semibold" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                Team wählen
              </Link>
            )}

            {user?.role === "admin" && (
              <>
                <hr className="my-4 border-brand" />
                <p className="text-xs text-gray-400 uppercase">Admin</p>
                <Link
                  to="/admin/teams"
                  className={`block hover:text-brand ${isActive("/admin/teams") ? "text-brand font-semibold" : ""}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  Teams verwalten
                </Link>
                <Link
                  to="/admin/users"
                  className={`block hover:text-brand ${isActive("/admin/users") ? "text-brand font-semibold" : ""}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  Benutzer
                </Link>
                <Link
                  to="/admin/seasons"
                  className={`block hover:text-brand ${isActive("/admin/seasons") ? "text-brand font-semibold" : ""}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  Seasons
                </Link>
                {seasons.map((season) => (
                  <div key={season._id} className="ml-2">
                    <button
                      className="flex items-center justify-between w-full text-left hover:text-brand text-sm"
                      onClick={() =>
                        setExpandedSeason((prev) =>
                          prev === season._id ? null : season._id
                        )
                      }
                    >
                      <span className="truncate">{season.name}</span>
                      {expandedSeason === season._id ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>
                    {expandedSeason === season._id && (
                      <div className="ml-4 mt-1 space-y-1">
                        {season.races.map((race) => (
                          <Link
                            key={race._id}
                            to={`/admin/races/${race._id}/results`}
                            className={`block text-sm pl-2 border-l border-brand hover:text-brand ${
                              isActive(`/admin/races/${race._id}/results`) ? "text-brand font-semibold" : ""
                            }`}
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

        {/* Footer mit Logout */}
        {user && (
          <div className="mt-10">
            <p className="text-sm text-gray-400 mb-2">Hallo, {user.username}</p>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="w-full text-left text-red-400 hover:text-red-600 text-sm"
            >
              Logout
            </button>
          </div>
        )}
      </aside>

      {/* Hauptinhalt */}
      <main className="flex-1 p-6 mt-14 md:mt-0">{children}</main>
    </div>
  );
}
