import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";
import "../styles/Login.css";

function getLoginErrorState(error) {
  const fallbackMessage =
    "Login ist derzeit nicht möglich. Bitte versuche es später erneut.";
  const apiMessage = error.response?.data?.message || "";
  const code = error.response?.data?.code;

  switch (code) {
    case "VALIDATION_USERNAME_REQUIRED":
    case "AUTH_USERNAME_NOT_FOUND":
      return { username: apiMessage || "Benutzername wurde nicht gefunden." };
    case "VALIDATION_PASSWORD_REQUIRED":
    case "AUTH_PASSWORD_INCORRECT":
      return { password: apiMessage || "Passwort ist ungültig." };
    case "AUTH_LOGIN_FAILED":
      return { form: apiMessage || fallbackMessage };
    default:
      return { form: apiMessage || error.message || fallbackMessage };
  }
}

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({
    form: "",
    username: "",
    password: "",
  });

  const clearError = (field) => {
    setErrors((prev) => ({ ...prev, form: "", [field]: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors({ form: "", username: "", password: "" });

    try {
      setIsSubmitting(true);

      const res = await API.post("/auth/login", {
        username: username.trim(),
        password,
      });

      localStorage.setItem("token", res.data.token);
      login(res.data.user);
      navigate("/");
    } catch (error) {
      setErrors((prev) => ({ ...prev, ...getLoginErrorState(error) }));
    } finally {
      setIsSubmitting(false);
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

        {errors.form ? <div className="login-error">{errors.form}</div> : null}

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <div className="form-group">
            <label htmlFor="login-username">Benutzername</label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                clearError("username");
              }}
              required
              autoFocus
              autoComplete="username"
              aria-invalid={errors.username ? "true" : "false"}
              aria-describedby={errors.username ? "login-username-error" : undefined}
              className={errors.username ? "input-error" : ""}
            />
            {errors.username ? (
              <div id="login-username-error" className="field-error">
                {errors.username}
              </div>
            ) : null}
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Passwort</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                clearError("password");
              }}
              required
              autoComplete="current-password"
              aria-invalid={errors.password ? "true" : "false"}
              aria-describedby={errors.password ? "login-password-error" : undefined}
              className={errors.password ? "input-error" : ""}
            />
            {errors.password ? (
              <div id="login-password-error" className="field-error">
                {errors.password}
              </div>
            ) : null}
          </div>
          <button type="submit" className="login-button" disabled={isSubmitting}>
            {isSubmitting ? "Einloggen..." : "Einloggen"}
          </button>
        </form>

        <p className="login-footer">
          Noch kein Konto? <Link to="/register">Jetzt registrieren</Link>
        </p>
      </div>
    </div>
  );
}
