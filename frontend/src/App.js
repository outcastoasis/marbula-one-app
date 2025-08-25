import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Teams from "./pages/Teams";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Navbar from "./components/Navbar";
import AdminTeams from "./pages/admin/AdminTeams";
import ProtectedRoute from "./components/ProtectedRoute";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";
import AdminSeasons from "./pages/admin/AdminSeasons";

function App() {
  const { loading } = useContext(AuthContext);

  if (loading) return <p>⏳ Lade Benutzer...</p>; // verhindert flackern/Logout
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/admin/teams"
          element={
            <ProtectedRoute adminOnly={true}>
              <AdminTeams />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/seasons"
          element={
            <ProtectedRoute adminOnly={true}>
              <AdminSeasons />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
