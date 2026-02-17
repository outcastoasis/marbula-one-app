import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarDays,
  faFlagCheckered,
  faSave,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import API from "../../api";
import "../../styles/AdminRaceResults.css";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("de-CH");
}

export default function AdminRaceResults() {
  const { raceId } = useParams();
  const [race, setRace] = useState(null);
  const [season, setSeason] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [userTeams, setUserTeams] = useState({});
  const [points, setPoints] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setUserTeams({});
    try {
      const raceRes = await API.get(`/races/${raceId}`);
      const raceData = raceRes.data;
      setRace(raceData);

      const seasonId =
        typeof raceData.season === "object" ? raceData.season?._id : raceData.season;

      const [seasonsRes, usersRes, teamsRes, assignmentsRes] = await Promise.all([
        API.get("/seasons"),
        API.get("/users"),
        API.get("/teams"),
        API.get(`/userSeasonTeams?season=${seasonId}`),
      ]);

      const foundSeason = seasonsRes.data.find((entry) => entry._id === seasonId) || null;
      setSeason(foundSeason);

      const participantIds = (foundSeason?.participants || []).map((entry) =>
        typeof entry === "object" ? entry._id : entry,
      );

      const filteredParticipants = usersRes.data
        .filter((user) => participantIds.includes(user._id))
        .sort((a, b) =>
          (a.realname || a.username).localeCompare(
            b.realname || b.username,
            "de-CH",
          ),
        );

      setParticipants(filteredParticipants);

      const teamsById = new Map(teamsRes.data.map((team) => [team._id, team.name]));
      const teamByUserId = {};

      (assignmentsRes.data || []).forEach((assignment) => {
        const assignmentSeasonId =
          typeof assignment.season === "object"
            ? assignment.season?._id
            : assignment.season;

        if (assignmentSeasonId !== seasonId) return;

        const userId =
          typeof assignment.user === "object"
            ? assignment.user?._id
            : assignment.user;

        const teamName =
          (typeof assignment.team === "object"
            ? assignment.team?.name
            : teamsById.get(assignment.team)) || null;

        if (userId) {
          teamByUserId[userId] = teamName;
        }
      });

      setUserTeams(teamByUserId);

      const existingPoints = {};
      (raceData.results || []).forEach((result) => {
        const userId =
          typeof result.user === "string" ? result.user : result.user?._id;
        if (userId) {
          existingPoints[userId] = result.pointsEarned ?? 0;
        }
      });
      setPoints(existingPoints);
    } catch (error) {
      console.error("Fehler beim Laden der Resultate:", error);
      setNotice({
        type: "error",
        text: "Resultatdaten konnten nicht geladen werden.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [raceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const participantsWithPoints = useMemo(
    () =>
      participants.map((user) => ({
        ...user,
        displayName: user.realname || user.username,
        teamName: userTeams[user._id] || null,
        points: Number.isFinite(points[user._id]) ? points[user._id] : 0,
      })),
    [participants, points, userTeams],
  );

  const handleChange = (userId, value) => {
    const numericValue = Number(value);
    setPoints({
      ...points,
      [userId]: Number.isFinite(numericValue) ? numericValue : 0,
    });
  };

  const saveResults = async () => {
    setIsSaving(true);
    try {
      const results = participants.map((user) => ({
        user: user._id,
        pointsEarned: Number.isFinite(points[user._id]) ? points[user._id] : 0,
      }));

      await API.put(`/races/${raceId}/results`, { results });
      setNotice({ type: "success", text: "Ergebnisse wurden gespeichert." });
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      setNotice({ type: "error", text: "Ergebnisse konnten nicht gespeichert werden." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="admin-race-results-page">
      <header className="admin-race-results-header">
        {season && (
          <Link
            to={`/admin/seasons/${season._id}/races`}
            className="admin-race-results-back-link"
          >
            Zurück zu den Rennen
          </Link>
        )}
        <h1>Punktevergabe</h1>
        <p>
          {race ? (
            <>
              Rennen <strong>{race.name}</strong>
              {season && (
                <>
                  {" "}
                  · Season <strong>{season.name}</strong>
                </>
              )}
              {season?.eventDate && (
                <>
                  {" "}
                  · Event-Datum: {formatDate(season.eventDate)}
                </>
              )}
            </>
          ) : (
            "Lade Renndaten…"
          )}
        </p>
      </header>

      {notice && (
        <p className={`admin-race-results-notice ${notice.type}`}>{notice.text}</p>
      )}

      <section className="admin-race-results-panel">
        <div className="admin-race-results-panel-head">
          <h2>Punkte erfassen</h2>
          <span className="admin-race-results-count">
            <FontAwesomeIcon icon={faUsers} />
            {participants.length}{" "}
            {participants.length === 1 ? "Teilnehmer" : "Teilnehmer"}
          </span>
        </div>

        {isLoading ? (
          <p className="admin-race-results-state">Lade Daten…</p>
        ) : participantsWithPoints.length === 0 ? (
          <p className="admin-race-results-state">
            Für diese Season sind keine Teilnehmer hinterlegt.
          </p>
        ) : (
          <div className="admin-race-results-list">
            {participantsWithPoints.map((user) => (
              <article key={user._id} className="admin-race-result-card">
                <div className="admin-race-result-meta">
                  <h3>{user.displayName}</h3>
                  {user.realname && user.username && (
                    <p className="admin-race-result-username">@{user.username}</p>
                  )}
                  <span className={user.teamName ? "" : "is-muted"}>
                    <FontAwesomeIcon icon={faFlagCheckered} />
                    {user.teamName || "Kein Team gewählt"}
                  </span>
                  {season?.eventDate && (
                    <span>
                      <FontAwesomeIcon icon={faCalendarDays} />
                      {formatDate(season.eventDate)}
                    </span>
                  )}
                </div>

                <label className="admin-race-result-input-wrap">
                  <span>Punkte</span>
                  <input
                    type="number"
                    value={user.points}
                    onChange={(event) => handleChange(user._id, event.target.value)}
                    min="0"
                  />
                </label>
              </article>
            ))}
          </div>
        )}

        <div className="admin-race-results-actions">
          <button
            type="button"
            className="admin-race-results-button"
            onClick={saveResults}
            disabled={isSaving || participants.length === 0}
          >
            <FontAwesomeIcon icon={faSave} />
            {isSaving ? "Speichern…" : "Ergebnisse speichern"}
          </button>
        </div>
      </section>
    </div>
  );
}
