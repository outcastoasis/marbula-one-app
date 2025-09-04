import { useEffect, useState } from "react";
import API from "../api";

export default function Teams() {
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    API.get("/teams")
      .then((res) => setTeams(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Alle Teams</h2>

      <div className="space-y-4">
        {teams.map((team) => (
          <div
            key={team._id}
            className="bg-brand-light p-4 rounded shadow flex justify-between items-center"
          >
            <span className="text-brand-text font-medium">{team.name}</span>
            {team.color && (
              <span className="text-sm text-gray-400">{team.color}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}