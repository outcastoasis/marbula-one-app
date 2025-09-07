import { useState, useEffect } from "react";
import API from "../../api";
import { Link } from "react-router-dom";
import "../../styles/AdminSeasons.css";

export default function AdminSeasons() {
  const [seasons, setSeasons] = useState([]);
  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [participants, setParticipants] = useState([]);
  const [users, setUsers] = useState([]);

  const fetchSeasons = async () => {
    const res = await API.get("/seasons");
    setSeasons(res.data);
  };

  const addSeason = async () => {
    if (!name || !eventDate) return;
    await API.post("/seasons", { name, eventDate, participants });
    setName("");
    setEventDate("");
    setParticipants([]);
    fetchSeasons();
  };

  const deleteSeason = async (id) => {
    await API.delete(`/seasons/${id}`);
    fetchSeasons();
  };

  const setCurrentSeason = async (id) => {
    await API.put(`/seasons/${id}/set-current`);
    fetchSeasons();
  };

  useEffect(() => {
    fetchSeasons();
    API.get("/users").then((res) => setUsers(res.data));
  }, []);

  return (
    <div className="admin-seasons-container">
      <h2>Seasons verwalten</h2>

      <div className="season-form">
        <div className="form-group">
          <label htmlFor="season-name">Season Name</label>
          <input
            id="season-name"
            placeholder="z. B. Season 5"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="event-date">Event-Datum</label>
          <input
            id="event-date"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="form-input"
          />
        </div>
        <div>
          <label>Teilnehmende Benutzer:</label>
          <button
            type="button"
            onClick={() => {
              if (participants.length === users.length) {
                setParticipants([]);
              } else {
                setParticipants(users.map((u) => u._id));
              }
            }}
            className="toggle-select"
          >
            {participants.length === users.length
              ? "Alle abwählen"
              : "Alle auswählen"}
          </button>
          <div className="checkbox-list">
            {users.map((u) => {
              const isSelected = participants.includes(u._id);
              return (
                <label key={u._id}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setParticipants([...participants, u._id]);
                      } else {
                        setParticipants(
                          participants.filter((id) => id !== u._id)
                        );
                      }
                    }}
                  />
                  <span>{u.username}</span>
                </label>
              );
            })}
          </div>
        </div>
        <button onClick={addSeason} className="add-button">
          Season hinzufügen
        </button>
      </div>

      <div className="season-list">
        {seasons.map((s) => (
          <div
            key={s._id}
            className={`season-item ${s.isCurrent ? "current" : ""}`}
          >
            <div>
              <h3>
                {s.name}{" "}
                {s.isCurrent && (
                  <span className="current-label">(Aktuell)</span>
                )}
              </h3>
              <p>{new Date(s.eventDate).toLocaleDateString()}</p>
            </div>
            <div className="season-actions">
              {!s.isCurrent && (
                <button onClick={() => setCurrentSeason(s._id)}>
                  Als aktuell setzen
                </button>
              )}
              <Link to={`/admin/seasons/${s._id}/races`}>
                → Rennen verwalten
              </Link>
              <button
                onClick={() => {
                  if (window.confirm(`Season "${s.name}" wirklich löschen?`)) {
                    deleteSeason(s._id);
                  }
                }}
                className="delete-btn"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
