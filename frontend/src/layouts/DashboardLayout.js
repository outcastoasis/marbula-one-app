import { Link, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function DashboardLayout({ children }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-brand-dark font-sans text-brand-text">
      {/* Sidebar */}
      <aside className="w-64 bg-brand-light shadow-md p-4">
        <h2 className="text-xl font-bold mb-6 text-brand-text">Marbula One</h2>
        <nav className="space-y-2">
          <Link to="/" className="block hover:text-brand">
            Home
          </Link>
          <Link to="/teams" className="block hover:text-brand">
            Teams
          </Link>
          {user && (
            <Link to="/choose-team" className="block hover:text-brand">
              Team wählen
            </Link>
          )}

          {user?.role === "admin" && (
            <>
              <hr className="my-4 border-brand" />
              <p className="text-xs text-gray-400 uppercase">Admin</p>
              <Link to="/admin/teams" className="block hover:text-brand">
                Teams verwalten
              </Link>
              <Link to="/admin/seasons" className="block hover:text-brand">
                Seasons
              </Link>
              <Link to="/admin/users" className="block hover:text-brand">
                Benutzer
              </Link>
            </>
          )}
        </nav>

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
      <main className="flex-1 p-6 bg-brand-dark text-brand-text">
        {children}
      </main>
    </div>
  );
}
