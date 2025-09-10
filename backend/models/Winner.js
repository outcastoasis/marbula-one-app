import mongoose from "mongoose";

const winnerSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    location: { type: String, required: true },
    winnerUser: { type: String, required: true },
    winnerTeam: { type: String, required: true },
    lastPlaceUser: { type: String, required: true },
    lastPlaceTeam: { type: String, required: true },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Winner", winnerSchema);
