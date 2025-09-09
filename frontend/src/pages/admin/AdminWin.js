import { useState } from "react";
import API from "../api";
import "../styles/AdminWin.css";

export default function AdminWin() {
  const [formData, setFormData] = useState({
    date: "",
    location: "",
    winnerUser: "",
    winnerTeam: "",
    lastPlaceUser: "",
    lastPlaceTeam: "",
    nextOrganizer: "",
    notes: "",
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post("/winners", formData);
      alert("Erfolgreich eingetragen!");
      setFormData({
        date: "",
        location: "",
        winnerUser: "",
        winnerTeam: "",
        lastPlaceUser: "",
        lastPlaceTeam: "",
        nextOrganizer: "",
        notes: "",
      });
    } catch (err) {
      console.error(err);
      alert("Fehler beim Eintragen.");
    }
  };

  return (
    <div className="admin-win-container">
      <h2>Neuen Event-Sieger eintragen</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="location"
          placeholder="Ort"
          value={formData.location}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="winnerUser"
          placeholder="Gewinner (Name)"
          value={formData.winnerUser}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="winnerTeam"
          placeholder="Gewinner-Team"
          value={formData.winnerTeam}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="lastPlaceUser"
          placeholder="Letzter Platz (Name)"
          value={formData.lastPlaceUser}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="lastPlaceTeam"
          placeholder="Letzter Platz-Team"
          value={formData.lastPlaceTeam}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="nextOrganizer"
          placeholder="Organisator nächstes Jahr"
          value={formData.nextOrganizer}
          onChange={handleChange}
          required
        />
        <textarea
          name="notes"
          placeholder="Notizen (optional)"
          value={formData.notes}
          onChange={handleChange}
        ></textarea>
        <button type="submit">Speichern</button>
      </form>
    </div>
  );
}
