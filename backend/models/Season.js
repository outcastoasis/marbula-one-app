// backend/models/Season.js

import mongoose from "mongoose";

const seasonSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  eventDate: { type: Date, required: true },
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  isCurrent: { type: Boolean, default: false }, // ← hinzugefügt
  isCompleted: { type: Boolean, default: false },
  teams: [{ type: mongoose.Schema.Types.ObjectId, ref: "Team" }],
});

export default mongoose.model("Season", seasonSchema);
