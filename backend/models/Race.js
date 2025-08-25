import mongoose from "mongoose";

const raceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: Date, required: true },
  season: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Season",
    required: true,
  },
});

export default mongoose.model("Race", raceSchema);
