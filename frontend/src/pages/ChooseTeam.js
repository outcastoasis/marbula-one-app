import { useContext, useEffect, useState } from "react";
import API from "../api";
import { AuthContext } from "../context/AuthContext";
import "../styles/ChooseTeam.css";

export default function ChooseTeam() {
  const { user } = useContext(AuthContext);
  const [teams, setTeams] = useState([]);
  const [takenTeams, setTakenTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [activeSeason, setActiveSeason] = useState(null);
  const [isSeasonParticipant, setIsSeasonParticipant] = useState(false);

  useEffect(() => {
    const fetchActiveSeason = async () => {
      try {
        const res = await API.get("/seasons/current");
        setActiveSeason(res.data || null);
      } catch (err) {
        console.error("Fehler beim Laden der aktiven Season", err);
        setActiveSeason(null);
      }
    };

    fetchActiveSeason();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!activeSeason || !user?._id) {
          setIsSeasonParticipant(false);
          setTeams([]);
          setTakenTeams([]);
          setSelectedTeam(null);
          return;
        }

        const participantIds = (activeSeason.participants || [])
          .map((participant) =>
            typeof participant === "object" ? participant?._id : participant,
          )
          .filter(Boolean);

        const canChooseTeam = participantIds.includes(user._id);
        setIsSeasonParticipant(canChooseTeam);

        if (!canChooseTeam) {
          setTeams([]);
          setTakenTeams([]);
          setSelectedTeam(null);
          return;
        }

        setTeams(activeSeason.teams || []);

        const res = await API.get(`/userSeasonTeams?season=${activeSeason._id}`);
        const allAssignments = Array.isArray(res.data) ? res.data : [];

        setTakenTeams(
          allAssignments
            .map((assignment) =>
              typeof assignment?.team === "object"
                ? assignment.team?._id
                : assignment?.team,
            )
            .filter(Boolean),
        );

        const mine = allAssignments.find(
          (assignment) =>
            (typeof assignment?.user === "object"
              ? assignment.user?._id
              : assignment?.user) === user._id,
        );

        const selected =
          typeof mine?.team === "object"
            ? mine.team
            : (activeSeason.teams || []).find((team) => team?._id === mine?.team) ||
              null;
        setSelectedTeam(selected);
      } catch (err) {
        console.error("Fehler beim Laden", err);
      }
    };

    fetchData();
  }, [activeSeason, user?._id]);

  const selectTeam = async (teamId) => {
    if (!activeSeason) {
      alert("Keine aktive Season gefunden");
      return;
    }

    if (!isSeasonParticipant) {
      alert(
        "Du bist in der aktuellen Season nicht als Teilnehmer hinterlegt. Teamwahl ist nicht moeglich.",
      );
      return;
    }

    try {
      const res = await API.post("/userSeasonTeams", {
        teamId,
        seasonId: activeSeason._id,
      });
      setSelectedTeam(res.data.team);
      setTakenTeams((prev) => (prev.includes(teamId) ? prev : [...prev, teamId]));
      window.dispatchEvent(new Event("user-season-team-updated"));
      alert("Team erfolgreich gewählt!");
    } catch (err) {
      alert(err.response?.data?.message || "Fehler bei Teamwahl");
    }
  };

  return (
    <div className="choose-container">
      <h1 className="choose-page-title">Team auswählen</h1>
      <p className="choose-page-subtitle">
        Wähle dein Team
        {activeSeason?.name ? (
          <>
            {" "}
            fuer <strong>{activeSeason.name}</strong>
          </>
        ) : (
          " für die aktuelle Season"
        )}
      </p>

      {!activeSeason ? (
        <div className="selected-team-box">
          <p>Aktuell ist keine Season aktiv.</p>
        </div>
      ) : !isSeasonParticipant ? (
        <div className="selected-team-box">
          <p>
            Du bist in <strong>{activeSeason.name}</strong> nicht als Teilnehmer
            hinterlegt.
          </p>
        </div>
      ) : selectedTeam ? (
        <div className="selected-team-box">
          <p>
            Dein Team für {activeSeason.name}: <strong>{selectedTeam.name}</strong>
          </p>
        </div>
      ) : (
        <div className="choose-grid">
          {teams.map((team) => (
            <div key={team._id} className="choose-card">
              <span className="choose-name">{team.name}</span>
              {takenTeams.includes(team._id) ? (
                <span className="choose-status">Vergeben</span>
              ) : (
                <button
                  type="button"
                  onClick={() => selectTeam(team._id)}
                  className="choose-select-btn"
                >
                  Wählen
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
