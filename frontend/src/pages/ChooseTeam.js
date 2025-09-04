import { useContext, useEffect, useState } from "react";
import API from "../api";
import { AuthContext } from "../context/AuthContext";

export default function ChooseTeam() {
  const { user, login } = useContext(AuthContext);
  const [teams, setTeams] = useState([]);
  const [takenTeams, setTakenTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(user?.selectedTeam || null);

  useEffect(() => {
    const fetchData = async () => {
      const teamRes = await API.get("/teams");
      setTeams(teamRes.data);

      const allUsers = await API.get("/users");
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
      login(res.data.user);
      setSelectedTeam(res.data.user.selectedTeam);
      alert("Team erfolgreich gewählt!");
    } catch (err) {
      alert(err.response?.data?.message || "Fehler bei Teamwahl");
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Team auswählen</h2>

      {selectedTeam ? (
        <div className="bg-brand-light p-4 rounded shadow">
          <p className="text-brand-text">
            Du hast bereits ein Team gewählt: <strong>{selectedTeam.name}</strong>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {teams.map((team) => (
            <div
              key={team._id}
              className="bg-brand-light p-4 rounded shadow flex justify-between items-center"
            >
              <span className="text-brand-text font-medium">{team.name}</span>
              {takenTeams.includes(team._id) ? (
                <span className="text-gray-400 text-sm">vergeben</span>
              ) : (
                <button
                  onClick={() => selectTeam(team._id)}
                  className="bg-brand text-white text-sm font-semibold py-1 px-3 rounded hover:bg-red-600 transition"
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
