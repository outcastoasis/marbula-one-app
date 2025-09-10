import { useEffect, useState } from "react";
import API from "../api";
import "../styles/Win.css";

export default function Win() {
  const [winners, setWinners] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const res = await API.get("/winners");
      setWinners(res.data);
    };
    fetchData();
  }, []);

  return (
    <div className="win-page">
      <h1>Vergangene Event-Gewinner</h1>
      {winners.map((w, idx) => (
        <div className="winner-card" key={idx}>
          <h2>
            {new Date(w.date).toLocaleDateString()} – {w.location}
          </h2>
          <p>
            <strong>🥇 Gewinner:</strong> {w.winnerUser} ({w.winnerTeam})
          </p>
          <p>
            <strong>🥄 Letzter Platz:</strong> {w.lastPlaceUser} (
            {w.lastPlaceTeam})
          </p>
          {w.notes && (
            <p>
              <strong>📝 Notizen:</strong> {w.notes}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
