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
import { Navigate } from "react-router-dom";
import AdminUserEdit from "./pages/admin/AdminUserEdit";
import TeamDetail from "./pages/TeamDetail";
import AdminWin from "./pages/admin/AdminWin";
import Win from "./pages/Win";
import "./index.css";

function App() {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading)
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Wird geladen, bitte warten...</p>
      </div>
    );

  return (
    <>
      {["/login", "/register"].includes(location.pathname) ? (
        <Routes>
          <Route
            path="/login"
            element={user ? <Navigate to="/" replace /> : <Login />}
          />
          <Route
            path="/register"
            element={user ? <Navigate to="/" replace /> : <Register />}
          />
          {/* Fallback auf Login wenn keine Route matcht */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <DashboardLayout>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teams"
              element={
                <ProtectedRoute>
                  <Teams />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teams/:id"
              element={
                <ProtectedRoute>
                  <TeamDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/winners"
              element={
                <ProtectedRoute>
                  <Win />
                </ProtectedRoute>
              }
            />
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
                <ProtectedRoute adminOnly>
                  <AdminTeams />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/winners"
              element={
                <ProtectedRoute adminOnly>
                  <AdminWin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/seasons"
              element={
                <ProtectedRoute adminOnly>
                  <AdminSeasons />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/seasons/:seasonId/races"
              element={
                <ProtectedRoute adminOnly>
                  <AdminSeasonRaces />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/races/:raceId/results"
              element={
                <ProtectedRoute adminOnly>
                  <AdminRaceResults />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute adminOnly>
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users/:id"
              element={
                <ProtectedRoute adminOnly>
                  <AdminUserEdit />
                </ProtectedRoute>
              }
            />
            {/* Fallback auf Startseite, falls Route nicht gefunden */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </DashboardLayout>
      )}
    </>
  );
}

export default App;
