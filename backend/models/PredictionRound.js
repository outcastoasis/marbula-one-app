import mongoose from "mongoose";

const { Schema } = mongoose;

const statusTransitionSchema = new Schema(
  {
    fromStatus: {
      type: String,
      enum: ["draft", "open", "locked", "scored", "published"],
      required: true,
    },
    toStatus: {
      type: String,
      enum: ["draft", "open", "locked", "scored", "published"],
      required: true,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    reason: {
      type: String,
      default: null,
      trim: true,
    },
    trigger: {
      type: String,
      default: "manual",
      trim: true,
    },
  },
  { _id: false },
);

const predictionRoundSchema = new Schema(
  {
    season: {
      type: Schema.Types.ObjectId,
      ref: "Season",
      required: true,
    },
    race: {
      type: Schema.Types.ObjectId,
      ref: "Race",
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "open", "locked", "scored", "published"],
      default: "draft",
    },
    lockMode: {
      type: String,
      enum: ["manual"],
      default: "manual",
    },
    scoringConfig: {
      exactPositionPoints: { type: Number, default: 6 },
      top3AnyPositionPoints: { type: Number, default: 3 },
      exactLastPlacePoints: { type: Number, default: 4 },
      tieBreakerEnabled: { type: Boolean, default: true },
      tieBreakerExactPoints: { type: Number, default: 3 },
      tieBreakerProximityWindow: { type: Number, default: 10 },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    openedAt: { type: Date, default: null },
    lockedAt: { type: Date, default: null },
    scoredAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    requiresReview: { type: Boolean, default: false },
    lastScoredAt: { type: Date, default: null },
    lastRaceResultsHash: { type: String, default: null },
    statusTransitions: {
      type: [statusTransitionSchema],
      default: [],
    },
  },
  { timestamps: true },
);

predictionRoundSchema.index({ season: 1, race: 1 }, { unique: true });
predictionRoundSchema.index({ season: 1, status: 1 });
predictionRoundSchema.index({ race: 1 });

const PredictionRound = mongoose.model("PredictionRound", predictionRoundSchema);
export default PredictionRound;
