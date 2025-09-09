import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import API from "../api";
import "../styles/Login.css"; // ← CSS importieren

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("/auth/login", { username, password });
      localStorage.setItem("token", res.data.token);
      login(res.data.user);
      navigate("/");
    } catch (err) {
      setError("Ungültige Anmeldedaten");
    }
  };

  return (
    <div className="login-container">
      <div className="login-header">
        <h1 className="app-title">
          Willkommen zu
          <br />
          Marbula One MHLWG
        </h1>
      </div>
      <div className="login-box">
        <h2>Login</h2>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Benutzername</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
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
          <button type="submit" className="login-button">
            Einloggen
          </button>
        </form>

        <p className="login-footer">
          Noch kein Konto? <a href="/register">Jetzt registrieren</a>
        </p>
      </div>
    </div>
  );
}
