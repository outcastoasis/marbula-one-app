import { Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Teams from "./pages/Teams";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminTeams from "./pages/admin/AdminTeams";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthContext } from "./context/AuthContext";
import AdminSeasons from "./pages/admin/AdminSeasons";
import AdminSeasonRaces from "./pages/admin/AdminSeasonRaces";
import ChooseTeam from "./pages/ChooseTeam";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminRaceResults from "./pages/admin/AdminRaceResults";
import DashboardLayout from "./layouts/DashboardLayout";
import { Navigate } from "react-router-dom";
import AdminUserEdit from "./pages/admin/AdminUserEdit";
import AdminPredictions from "./pages/admin/AdminPredictions";
import TeamDetail from "./pages/TeamDetail";
import AdminWin from "./pages/admin/AdminWin";
import Win from "./pages/Win";
import Stats from "./pages/Stats";
import Predictions from "./pages/Predictions";
import API, { API_NETWORK_EVENT } from "./api";
import "./index.css";
import { useContext, useEffect, useRef, useState } from "react";

function App() {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();
  const [apiNetworkState, setApiNetworkState] = useState({
    pendingRequestCount: 0,
    hasSlowRequest: false,
  });
  const lastWakeUpRef = useRef(0);

  useEffect(() => {
    const handleApiNetworkState = (event) => {
      const nextState = event?.detail || {};
      setApiNetworkState({
        pendingRequestCount:
          typeof nextState.pendingRequestCount === "number"
            ? nextState.pendingRequestCount
            : 0,
        hasSlowRequest: Boolean(nextState.hasSlowRequest),
      });
    };

    window.addEventListener(API_NETWORK_EVENT, handleApiNetworkState);

    return () => {
      window.removeEventListener(API_NETWORK_EVENT, handleApiNetworkState);
    };
  }, []);

  useEffect(() => {
    const wakeUpBackend = () => {
      if (!user?._id) {
        return;
      }

      const now = Date.now();
      if (now - lastWakeUpRef.current < 60000) {
        return;
      }

      lastWakeUpRef.current = now;
      API.get("/auth/me").catch(() => {
        // Ignore: this request is only used to wake a sleeping backend.
      });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        wakeUpBackend();
      }
    };

    const onPageShow = (event) => {
      if (event.persisted) {
        wakeUpBackend();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [user?._id]);

  const showGlobalApiLoader =
    apiNetworkState.pendingRequestCount > 0 && apiNetworkState.hasSlowRequest;

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
              path="/stats"
              element={
                <ProtectedRoute>
                  <Stats />
                </ProtectedRoute>
              }
            />
            <Route
              path="/predictions"
              element={
                <ProtectedRoute>
                  <Predictions />
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
            <Route
              path="/admin/predictions"
              element={
                <ProtectedRoute adminOnly>
                  <AdminPredictions />
                </ProtectedRoute>
              }
            />
            {/* Fallback auf Startseite, falls Route nicht gefunden */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </DashboardLayout>
      )}
      {showGlobalApiLoader ? (
        <div className="global-api-loader" role="status" aria-live="polite">
          <div className="global-api-loader-spinner" aria-hidden="true" />
          <p>Backend startet oder antwortet langsam...</p>
        </div>
      ) : null}
    </>
  );
}

export default App;
