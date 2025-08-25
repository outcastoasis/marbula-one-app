import mongoose from "mongoose";

const seasonSchema = new mongoose.Schema({
  year: { type: Number, required: true, unique: true },
  eventDate: { type: Date, required: true },
});

export default mongoose.model("Season", seasonSchema);
