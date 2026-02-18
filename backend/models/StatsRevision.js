import mongoose from "mongoose";

const statsRevisionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "global" },
    value: { type: Number, required: true, default: 1 },
  },
  { timestamps: true },
);

export default mongoose.model("StatsRevision", statsRevisionSchema);
