import { useState, useEffect } from "react";
import API from "../../api";
import { Link } from "react-router-dom";

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
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Seasons verwalten</h2>

      <div className="bg-brand-light p-6 rounded-lg shadow space-y-4 mb-10">
        <div>
          <label className="block text-sm mb-1">Season Name</label>
          <input
            placeholder="z. B. Season 5"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 bg-brand-dark border border-brand-border text-brand-text rounded focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Event-Datum</label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full px-4 py-2 bg-brand-dark border border-brand-border text-brand-text rounded focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <div>
          <label className="block text-sm mb-1 mb-2">
            Teilnehmende Benutzer:
          </label>
          <button
            type="button"
            onClick={() => {
              if (participants.length === users.length) {
                setParticipants([]);
              } else {
                setParticipants(users.map((u) => u._id));
              }
            }}
            className="text-sm text-brand hover:underline mb-2"
          >
            {participants.length === users.length
              ? "Alle abwählen"
              : "Alle auswählen"}
          </button>

          <div className="space-y-3 max-h-64 overflow-y-auto bg-brand-dark p-4 rounded border border-brand-border">
            {users.map((u) => {
              const isSelected = participants.includes(u._id);
              return (
                <label
                  key={u._id}
                  className="flex items-center gap-3 cursor-pointer text-base text-brand-text"
                >
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
                    className="w-5 h-5 rounded border-gray-400 text-brand focus:ring-2 focus:ring-brand"
                  />
                  <span>{u.username}</span>
                </label>
              );
            })}
          </div>
        </div>
        <button
          onClick={addSeason}
          className="bg-brand text-white font-semibold py-2 px-4 rounded hover:bg-red-600 transition"
        >
          Season hinzufügen
        </button>
      </div>

      <div className="space-y-4">
        {seasons.map((s) => (
          <div
            key={s._id}
            className={`bg-brand-light p-4 rounded-lg shadow flex justify-between items-center border-l-4 ${s.isCurrent ? "border-green-500" : "border-transparent"}`}
          >
            <div>
              <h3 className="font-semibold">
                {s.name} {s.isCurrent && <span className="text-green-500 text-sm ml-2">(Aktuell)</span>}
              </h3>
              <p className="text-sm text-gray-400">
                {new Date(s.eventDate).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-4 items-center">
              {!s.isCurrent && (
                <button
                  onClick={() => setCurrentSeason(s._id)}
                  className="text-sm text-green-400 hover:text-green-600"
                >
                  Als aktuell setzen
                </button>
              )}
              <Link
                to={`/admin/seasons/${s._id}/races`}
                className="text-brand hover:underline"
              >
                → Rennen verwalten
              </Link>
              <button
                onClick={() => {
                  if (window.confirm(`Season "${s.name}" wirklich löschen?`)) {
                    deleteSeason(s._id);
                  }
                }}
                className="text-red-500 hover:text-red-700"
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
