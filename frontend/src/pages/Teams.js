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
    <div>
      <h2>Teams</h2>
      <ul>
        {teams.map((team) => (
          <li key={team._id}>
            {team.name} {team.color && `(${team.color})`}
          </li>
        ))}
      </ul>
    </div>
  );
}
