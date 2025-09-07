import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  realname: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  selectedTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    unique: true,
    sparse: true,
  },
});

export default mongoose.model("User", userSchema);
