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
          {user.role === "admin" && (
            <>
              <Link to="/admin/teams">Admin: Teams</Link>|{" "}
              <Link to="/admin/seasons">Admin: Seasons</Link>
            </>
          )}
          <button onClick={handleLogout}>Logout</button>
        </>
      )}
    </nav>
  );
}
