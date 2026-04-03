import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";
import "../styles/Register.css";

function getRegisterErrorState(error) {
  const fallbackMessage =
    "Registrierung ist derzeit nicht möglich. Bitte versuche es später erneut.";
  const apiMessage = error.response?.data?.message || "";
  const code = error.response?.data?.code;

  switch (code) {
    case "VALIDATION_USERNAME_REQUIRED":
    case "VALIDATION_USERNAME_TOO_SHORT":
    case "VALIDATION_USERNAME_TOO_LONG":
    case "VALIDATION_USERNAME_INVALID_FORMAT":
    case "AUTH_USERNAME_TAKEN":
      return { username: apiMessage || "Benutzername ist ungültig." };
    case "VALIDATION_REALNAME_REQUIRED":
    case "VALIDATION_REALNAME_TOO_SHORT":
    case "VALIDATION_REALNAME_TOO_LONG":
      return { realname: apiMessage || "Name ist ungültig." };
    case "VALIDATION_PASSWORD_REQUIRED":
    case "VALIDATION_PASSWORD_BLANK":
    case "VALIDATION_PASSWORD_TOO_SHORT":
    case "VALIDATION_PASSWORD_TOO_LONG":
      return { password: apiMessage || "Passwort ist ungültig." };
    case "AUTH_REGISTER_FAILED":
      return { form: apiMessage || fallbackMessage };
    default:
      return { form: apiMessage || error.message || fallbackMessage };
  }
}

export default function Register() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [realname, setRealname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({
    form: "",
    username: "",
    realname: "",
    password: "",
  });

  const clearError = (field) => {
    setErrors((prev) => ({ ...prev, form: "", [field]: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors({ form: "", username: "", realname: "", password: "" });

    try {
      setIsSubmitting(true);

      const res = await API.post("/auth/register", {
        username: username.trim(),
        realname: realname.trim(),
        password,
      });

      localStorage.setItem("token", res.data.token);
      login(res.data.user);
      navigate("/");
    } catch (error) {
      setErrors((prev) => ({ ...prev, ...getRegisterErrorState(error) }));
    } finally {
      setIsSubmitting(false);
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

        {errors.form ? <div className="register-error">{errors.form}</div> : null}

        <form onSubmit={handleSubmit} className="register-form" noValidate>
          <div className="form-group">
            <label htmlFor="register-username">Benutzername</label>
            <input
              id="register-username"
              type="text"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                clearError("username");
              }}
              required
              autoComplete="username"
              aria-invalid={errors.username ? "true" : "false"}
              aria-describedby={
                errors.username ? "register-username-error" : undefined
              }
              className={errors.username ? "input-error" : ""}
            />
            {errors.username ? (
              <div id="register-username-error" className="field-error">
                {errors.username}
              </div>
            ) : null}
          </div>
          <div className="form-group">
            <label htmlFor="register-realname">Name</label>
            <input
              id="register-realname"
              type="text"
              value={realname}
              onChange={(event) => {
                setRealname(event.target.value);
                clearError("realname");
              }}
              required
              autoComplete="name"
              aria-invalid={errors.realname ? "true" : "false"}
              aria-describedby={
                errors.realname ? "register-realname-error" : undefined
              }
              className={errors.realname ? "input-error" : ""}
            />
            {errors.realname ? (
              <div id="register-realname-error" className="field-error">
                {errors.realname}
              </div>
            ) : null}
          </div>
          <div className="form-group">
            <label htmlFor="register-password">Passwort</label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                clearError("password");
              }}
              required
              autoComplete="new-password"
              aria-invalid={errors.password ? "true" : "false"}
              aria-describedby={
                errors.password ? "register-password-error" : undefined
              }
              className={errors.password ? "input-error" : ""}
            />
            {errors.password ? (
              <div id="register-password-error" className="field-error">
                {errors.password}
              </div>
            ) : null}
          </div>
          <button
            type="submit"
            className="register-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Registriere..." : "Registrieren"}
          </button>
        </form>

        <p className="register-footer">
          Bereits registriert? <Link to="/login">Zum Login</Link>
        </p>
      </div>
    </div>
  );
}
