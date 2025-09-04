import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import raceRoutes from "./routes/raceRoutes.js";
import seasonRoutes from "./routes/seasonRoutes.js";
import userRoutes from "./routes/userRoutes.js";

dotenv.config();
connectDB();

const app = express();

// 🔐 CORS Setup
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000", // z. B. https://marbula.vercel.app
    credentials: true,
  })
);

app.use(express.json());

// 🔍 Debug (optional)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ✅ Health check
app.get("/", (req, res) => {
  res.send("API läuft ✅");
});

// 📦 API Routes
app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/races", raceRoutes);
app.use("/api/seasons", seasonRoutes);
app.use("/api/users", userRoutes);

// 🔁 Server starten
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
