import { createContext, useEffect, useState } from "react";
import API from "../api";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // ← wichtig

  useEffect(() => {
    const checkLogin = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const res = await API.get("/auth/me");
          setUser(res.data); // ← hier wird user aus dem Token geladen
        } catch {
          localStorage.removeItem("token");
        }
      }
      setLoading(false); // ← fertig geladen
    };
    checkLogin();
  }, []);

  const login = (userData) => setUser(userData);
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
