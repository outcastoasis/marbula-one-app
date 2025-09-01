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
});

export default mongoose.model("Season", seasonSchema);
