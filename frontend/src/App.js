import { Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Teams from "./pages/Teams";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminTeams from "./pages/admin/AdminTeams";
import ProtectedRoute from "./components/ProtectedRoute";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";
import AdminSeasons from "./pages/admin/AdminSeasons";
import AdminSeasonRaces from "./pages/admin/AdminSeasonRaces";
import ChooseTeam from "./pages/ChooseTeam";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminRaceResults from "./pages/admin/AdminRaceResults";
import DashboardLayout from "./layouts/DashboardLayout";

function App() {
  const { loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) return <p>⏳ Lade Benutzer...</p>; // verhindert flackern/Logout

  return (
    <>
      {["/login", "/register"].includes(location.pathname) ? (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      ) : (
        <DashboardLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/teams" element={<Teams />} />
            <Route
              path="/choose-team"
              element={
                <ProtectedRoute>
                  <ChooseTeam />
                </ProtectedRoute>
              }
            />
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
            <Route
              path="/admin/seasons/:seasonId/races"
              element={
                <ProtectedRoute adminOnly={true}>
                  <AdminSeasonRaces />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/races/:raceId/results"
              element={
                <ProtectedRoute adminOnly={true}>
                  <AdminRaceResults />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute adminOnly={true}>
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
          </Routes>
        </DashboardLayout>
      )}
    </>
  );
}

export default App;
