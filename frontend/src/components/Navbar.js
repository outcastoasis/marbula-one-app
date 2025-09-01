import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav>
      <Link to="/">Home</Link> | <Link to="/teams">Teams</Link> |{" "}
      {!user && (
        <>
          <Link to="/login">Login</Link> | <Link to="/register">Register</Link>
        </>
      )}
      {user && (
        <>
          Hallo, {user.username} |{" "}
          {/* Nur zeigen, wenn der Benutzer noch kein Team gewählt hat */}
          {!user.selectedTeam && (
            <>
              <Link to="/choose-team">Team wählen</Link> |{" "}
            </>
          )}
          {/* Adminlinks */}
          {user.role === "admin" && (
            <>
              <Link to="/admin/teams">Admin: Teams</Link> |{" "}
              <Link to="/admin/seasons">Admin: Seasons</Link>
              <Link to="/admin/users">Admin: Benutzer</Link>
            </>
          )}
          <button onClick={handleLogout}>Logout</button>
        </>
      )}
    </nav>
  );
}
