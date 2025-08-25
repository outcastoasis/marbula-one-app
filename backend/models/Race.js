import mongoose from "mongoose";

const raceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: Date, required: true },
  season: { type: mongoose.Schema.Types.ObjectId, ref: "Season" },
  results: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      position: Number,
      pointsEarned: Number,
    },
  ],
});

export default mongoose.model("Race", raceSchema);
