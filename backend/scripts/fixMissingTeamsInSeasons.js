// scripts/fixMissingTeamsInSeasons.js

import mongoose from "mongoose";
import dotenv from "dotenv";
import Season from "../models/Season.js";
import UserSeasonTeam from "../models/UserSeasonTeam.js";

dotenv.config();
await mongoose.connect(process.env.MONGO_URI);

console.log("🔄 Füge Teams zu bestehenden Seasons hinzu...");

const seasons = await Season.find();

for (const season of seasons) {
  // Falls die Season bereits Teams hat, überspringen
  if (season.teams && season.teams.length > 0) {
    console.log(`✅ ${season.name} hat bereits Teams`);
    continue;
  }

  // Alle Teams dieser Season aus UserSeasonTeam extrahieren
  const assignments = await UserSeasonTeam.find({ season: season._id });

  const teamIds = assignments
    .map((a) => a.team)
    .filter((id, index, arr) => id && arr.indexOf(id) === index); // eindeutige, gültige IDs

  // Teams speichern, wenn gefunden
  if (teamIds.length > 0) {
    season.teams = teamIds;
    await season.save();
    console.log(`✔️ Season ${season.name}: ${teamIds.length} Teams zugewiesen`);
  } else {
    console.log(`⚠️ Season ${season.name}: Keine Teamzuweisungen gefunden`);
  }
}

await mongoose.disconnect();
console.log("✅ Nachpflege abgeschlossen.");
