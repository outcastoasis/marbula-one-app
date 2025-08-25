import mongoose from "mongoose";

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  color: { type: String }, // z. B. "#FF0000"
  logoUrl: { type: String }, // später für Bilddateien
});

export default mongoose.model("Team", teamSchema);
