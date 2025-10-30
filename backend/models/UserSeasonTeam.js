// backend/models/UserSeasonTeam.js

import mongoose from "mongoose";

const userSeasonTeamSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    season: { type: mongoose.Schema.Types.ObjectId, ref: "Season", required: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  },
  {
    timestamps: true,
  }
);

// Ein Benutzer darf nur ein Team pro Season haben
userSeasonTeamSchema.index({ user: 1, season: 1 }, { unique: true });

// Ein Team darf nur einmal pro Season zugewiesen werden (exklusiv)
userSeasonTeamSchema.index({ team: 1, season: 1 }, { unique: true });

const UserSeasonTeam = mongoose.model("UserSeasonTeam", userSeasonTeamSchema);
export default UserSeasonTeam;
