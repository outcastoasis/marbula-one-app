import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import API from "../api";
import "../styles/Register.css"; // Externes CSS

export default function Register() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [realname, setRealname] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("/auth/register", {
        username,
        realname,
        password,
      });
      localStorage.setItem("token", res.data.token);
      login(res.data.user);
      navigate("/");
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Unbekannter Fehler";
      setError("Registrierung fehlgeschlagen: " + message);
    }
  };

  return (
    <div className="register-container">
      <div className="register-header">
        <h1 className="app-title">
          Willkommen zu
          <br />
          Marbula One MHLWG
        </h1>
      </div>
      <div className="register-box">
        <h2>Konto erstellen</h2>

        {error && <div className="register-error">{error}</div>}

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label>Benutzername</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={realname}
              onChange={(e) => setRealname(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="register-button">
            Registrieren
          </button>
        </form>

        <p className="register-footer">
          Bereits registriert? <a href="/login">Zum Login</a>
        </p>
      </div>
    </div>
  );
}
