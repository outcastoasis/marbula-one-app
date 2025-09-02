import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import API from "../api";

export default function Register() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("/auth/register", {
        username,
        email,
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
    <div className="min-h-screen flex items-center justify-center bg-brand-dark text-brand-text px-4">
      <div className="max-w-md w-full bg-brand-light rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-6">Konto erstellen</h2>

        {error && (
          <div className="bg-red-500/10 text-red-400 px-4 py-2 mb-4 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Benutzername</label>
            <input
              type="text"
              className="mt-1 w-full px-4 py-2 bg-brand-dark border border-brand-border text-brand-text rounded focus:outline-none focus:ring-2 focus:ring-brand"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              className="mt-1 w-full px-4 py-2 bg-brand-dark border border-brand-border text-brand-text rounded focus:outline-none focus:ring-2 focus:ring-brand"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Passwort</label>
            <input
              type="password"
              className="mt-1 w-full px-4 py-2 bg-brand-dark border border-brand-border text-brand-text rounded focus:outline-none focus:ring-2 focus:ring-brand"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-brand text-white font-semibold py-2 rounded hover:bg-red-600 transition"
          >
            Registrieren
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-400">
          Bereits registriert?{" "}
          <a href="/login" className="text-brand hover:underline">
            Zum Login
          </a>
        </p>
      </div>
    </div>
  );
}
