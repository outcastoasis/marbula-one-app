import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import API from "../api";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

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
      alert(
        "Registrierung fehlgeschlagen: " + err.response?.data?.message ||
          err.message
      );
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Registrieren</h2>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Benutzername"
        required
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Passwort"
        required
      />
      <button type="submit">Registrieren</button>
    </form>
  );
}
