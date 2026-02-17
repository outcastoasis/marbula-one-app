import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Kein Token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({ message: "Benutzer nicht gefunden" });
    }

    next();
  } catch (err) {
    res.status(401).json({ message: "Ungültiger Token" });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Nur für Admins erlaubt" });
  }
  next();
};

export const requireAdminOrSelf = (paramName = "id") => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Nicht authentifiziert" });
    }

    if (req.user.role === "admin") {
      return next();
    }

    if (req.user._id?.toString() === req.params[paramName]) {
      return next();
    }

    return res.status(403).json({ message: "Nicht erlaubt" });
  };
};
