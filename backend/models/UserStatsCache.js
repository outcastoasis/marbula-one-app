import mongoose from "mongoose";

const userStatsCacheSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    completedOnly: { type: Boolean, required: true, default: true },
    revision: { type: Number, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

userStatsCacheSchema.index({ user: 1, completedOnly: 1 }, { unique: true });

export default mongoose.model("UserStatsCache", userStatsCacheSchema);
