import mongoose from "mongoose";

const { Schema } = mongoose;

const picksSchema = new Schema(
  {
    p1: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    p2: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    p3: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    lastPlace: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    tieBreaker: { type: Number, default: null },
  },
  { _id: false },
);

const predictionEntrySchema = new Schema(
  {
    roundId: {
      type: Schema.Types.ObjectId,
      ref: "PredictionRound",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    picks: {
      type: picksSchema,
      required: true,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

predictionEntrySchema.pre("validate", function validateUniquePicks(next) {
  if (!this.picks) {
    return next();
  }

  const ids = [
    this.picks.p1,
    this.picks.p2,
    this.picks.p3,
    this.picks.lastPlace,
  ]
    .filter(Boolean)
    .map((id) => String(id));

  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    return next(
      new Error("Ein Team darf in einem Tipp nur einmal ausgewählt werden."),
    );
  }

  return next();
});

predictionEntrySchema.index({ roundId: 1, userId: 1 }, { unique: true });
predictionEntrySchema.index({ userId: 1, createdAt: 1 });
predictionEntrySchema.index({ roundId: 1, createdAt: 1 });

const PredictionEntry = mongoose.model("PredictionEntry", predictionEntrySchema);
export default PredictionEntry;
