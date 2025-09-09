import mongoose from "mongoose";

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  color: { type: String },
  logoUrl: { type: String },
  description: { type: String }, // <- NEU
});

export default mongoose.model("Team", teamSchema);
