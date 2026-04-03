import { useContext, useEffect, useState } from "react";
import API from "../api";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import "../styles/ChooseTeam.css";

function getApiErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback;
}

export default function ChooseTeam() {
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const [teams, setTeams] = useState([]);
  const [takenTeams, setTakenTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [activeSeason, setActiveSeason] = useState(null);
  const [isSeasonParticipant, setIsSeasonParticipant] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingTeamId, setIsSubmittingTeamId] = useState(null);

  useEffect(() => {
    let isCancelled = false;

    const resetSelectionState = () => {
      setTeams([]);
      setTakenTeams([]);
      setSelectedTeam(null);
      setIsSeasonParticipant(false);
    };

    const loadTeamSelection = async () => {
      setIsLoading(true);

      try {
        const seasonRes = await API.get("/seasons/current");
        const currentSeason = seasonRes.data || null;

        if (isCancelled) {
          return;
        }

        setActiveSeason(currentSeason);

        if (!currentSeason || !user?._id) {
          resetSelectionState();
          return;
        }

        const participantIds = (currentSeason.participants || [])
          .map((participant) =>
            typeof participant === "object" ? participant?._id : participant,
          )
          .filter(Boolean);

        const canChooseTeam = participantIds.includes(user._id);
        setIsSeasonParticipant(canChooseTeam);

        const seasonTeams = Array.isArray(currentSeason.teams)
          ? currentSeason.teams
          : [];
        setTeams(seasonTeams);

        if (!canChooseTeam) {
          setTakenTeams([]);
          setSelectedTeam(null);
          return;
        }

        const assignmentsRes = await API.get(
          `/userSeasonTeams?season=${currentSeason._id}`,
        );

        if (isCancelled) {
          return;
        }

        const allAssignments = Array.isArray(assignmentsRes.data)
          ? assignmentsRes.data
          : [];

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

        const currentSelection =
          typeof mine?.team === "object"
            ? mine.team
            : seasonTeams.find((team) => team?._id === mine?.team) || null;

        setSelectedTeam(currentSelection);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (error?.response?.status === 404) {
          setActiveSeason(null);
          resetSelectionState();
          return;
        }

        console.error("Fehler beim Laden der Teamwahl:", error);
        toast.error(
          getApiErrorMessage(error, "Teamwahl konnte nicht geladen werden."),
        );
        setActiveSeason(null);
        resetSelectionState();
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadTeamSelection();

    return () => {
      isCancelled = true;
    };
  }, [toast, user?._id]);

  const selectTeam = async (teamId) => {
    if (isSubmittingTeamId) {
      return;
    }

    if (!activeSeason) {
      toast.info("Keine aktive Season gefunden.");
      return;
    }

    if (!isSeasonParticipant) {
      toast.info(
        "Du bist in der aktuellen Season nicht als Teilnehmer hinterlegt.",
      );
      return;
    }

    try {
      setIsSubmittingTeamId(teamId);

      const res = await API.post("/userSeasonTeams", {
        teamId,
        seasonId: activeSeason._id,
      });

      const nextSelectedTeam =
        res.data?.team || teams.find((team) => team?._id === teamId) || null;

      setSelectedTeam(nextSelectedTeam);
      setTakenTeams((prev) => (prev.includes(teamId) ? prev : [...prev, teamId]));
      window.dispatchEvent(new Event("user-season-team-updated"));
      toast.success(`Team für ${activeSeason.name} erfolgreich gewählt.`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Fehler bei der Teamwahl."));
    } finally {
      setIsSubmittingTeamId(null);
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
            für <strong>{activeSeason.name}</strong>
          </>
        ) : (
          " für die aktuelle Season"
        )}
      </p>

      {isLoading ? (
        <div className="selected-team-box">
          <p>Aktuelle Season wird geladen...</p>
        </div>
      ) : !activeSeason ? (
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
      ) : teams.length === 0 ? (
        <div className="selected-team-box">
          <p>Für diese Season sind aktuell noch keine Teams hinterlegt.</p>
        </div>
      ) : (
        <div className="choose-grid">
          {teams.map((team) => {
            const isTaken = takenTeams.includes(team._id);
            const isSaving = isSubmittingTeamId === team._id;

            return (
              <div key={team._id} className="choose-card">
                <span className="choose-name">{team.name}</span>
                {isTaken ? (
                  <span className="choose-status">Vergeben</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => selectTeam(team._id)}
                    className="choose-select-btn"
                    disabled={Boolean(isSubmittingTeamId)}
                  >
                    {isSaving ? "Wird gespeichert..." : "Wählen"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
