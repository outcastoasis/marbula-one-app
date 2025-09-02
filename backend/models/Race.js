import mongoose from "mongoose";

const raceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  season: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Season",
    required: true,
  },
  results: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      pointsEarned: { type: Number, default: 0 },
    },
  ],
});

export default mongoose.model("Race", raceSchema);
