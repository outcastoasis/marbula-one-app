import mongoose from "mongoose";

const { Schema } = mongoose;

const snapshotSchema = new Schema(
  {
    p1: { type: Schema.Types.ObjectId, ref: "Team", default: null },
    p2: { type: Schema.Types.ObjectId, ref: "Team", default: null },
    p3: { type: Schema.Types.ObjectId, ref: "Team", default: null },
    lastPlace: { type: Schema.Types.ObjectId, ref: "Team", default: null },
    tieBreaker: { type: Number, default: null },
  },
  { _id: false },
);

const breakdownSchema = new Schema(
  {
    code: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    points: { type: Number, required: true },
    details: { type: String, default: null },
  },
  { _id: false },
);

const generatedFromSchema = new Schema(
  {
    raceId: {
      type: Schema.Types.ObjectId,
      ref: "Race",
      required: true,
    },
    raceResultsHash: { type: String, required: true },
    generatedAt: { type: Date, required: true },
    trigger: { type: String, required: true, trim: true },
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { _id: false },
);

const predictionScoreSchema = new Schema(
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
    total: {
      type: Number,
      default: 0,
    },
    breakdown: {
      type: [breakdownSchema],
      default: [],
    },
    predicted: {
      type: snapshotSchema,
      default: () => ({}),
    },
    actual: {
      type: snapshotSchema,
      default: () => ({}),
    },
    generatedFrom: {
      type: generatedFromSchema,
      required: true,
    },
    isOverridden: {
      type: Boolean,
      default: false,
    },
    overrideReason: {
      type: String,
      default: null,
      trim: true,
    },
    overrideBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    overrideAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

predictionScoreSchema.index({ roundId: 1, userId: 1 }, { unique: true });
predictionScoreSchema.index({ roundId: 1, total: -1 });
predictionScoreSchema.index({ userId: 1, createdAt: 1 });

const PredictionScore = mongoose.model("PredictionScore", predictionScoreSchema);
export default PredictionScore;
