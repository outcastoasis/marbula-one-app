import { useContext, useEffect, useState } from "react";
import API from "../api";
import { AuthContext } from "../context/AuthContext";

export default function ChooseTeam() {
  const { user, login } = useContext(AuthContext);
  const [teams, setTeams] = useState([]);
  const [takenTeams, setTakenTeams] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const teamRes = await API.get("/teams");
      setTeams(teamRes.data);

      const allUsers = await API.get("/users"); // optional: musst du noch bauen, wenn du alle brauchst
      const taken = allUsers.data
        .map((u) => u.selectedTeam?._id)
        .filter((id) => id);
      setTakenTeams(taken);
    };
    fetchData();
  }, []);

  const selectTeam = async (teamId) => {
    try {
      const res = await API.put("/users/choose-team", { teamId });
      login(res.data.user); // aktualisiert Context
      alert("Team erfolgreich gewählt!");
    } catch (err) {
      alert(err.response?.data?.message || "Fehler bei Teamwahl");
    }
  };

  return (
    <div>
      <h2>Team auswählen</h2>
      {user?.selectedTeam ? (
        <p>Du hast bereits ein Team gewählt: {user.selectedTeam.name}</p>
      ) : (
        <ul>
          {teams.map((team) => (
            <li key={team._id}>
              {team.name}{" "}
              {takenTeams.includes(team._id) ? (
                <span>(bereits vergeben)</span>
              ) : (
                <button onClick={() => selectTeam(team._id)}>Wählen</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
