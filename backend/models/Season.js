import mongoose from "mongoose";

const seasonSchema = new mongoose.Schema({
  year: { type: Number, required: true, unique: true },
  isCurrent: { type: Boolean, default: false },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  races: [{ type: mongoose.Schema.Types.ObjectId, ref: "Race" }],
});

export default mongoose.model("Season", seasonSchema);
