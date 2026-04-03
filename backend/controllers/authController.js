import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  buildErrorResponse,
  validateLoginPayload,
  validateRegistrationPayload,
} from "../utils/authValidation.js";

const sanitizeUser = (userDoc) => {
  const { password: _password, ...safeUser } = userDoc.toObject();
  return safeUser;
};

export const registerUser = async (req, res) => {
  try {
    const { username, realname, password, error } = validateRegistrationPayload(
      req.body,
    );

    if (error) {
      return res.status(error.status).json(buildErrorResponse(error));
    }

    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(409).json({
        message: "Benutzername existiert bereits.",
        code: "AUTH_USERNAME_TAKEN",
        field: "username",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      realname,
      password: hashedPassword,
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    return res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (error) {
    console.error("Fehler bei der Registrierung:", error);
    return res.status(500).json({
      message: "Registrierung ist derzeit nicht möglich.",
      code: "AUTH_REGISTER_FAILED",
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { username, password, error } = validateLoginPayload(req.body);

    if (error) {
      return res.status(error.status).json(buildErrorResponse(error));
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({
        message: "Benutzername wurde nicht gefunden.",
        code: "AUTH_USERNAME_NOT_FOUND",
        field: "username",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Passwort ist ungültig.",
        code: "AUTH_PASSWORD_INCORRECT",
        field: "password",
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    return res.status(200).json({ token, user: sanitizeUser(user) });
  } catch (error) {
    console.error("Fehler beim Login:", error);
    return res.status(500).json({
      message: "Login ist derzeit nicht möglich.",
      code: "AUTH_LOGIN_FAILED",
    });
  }
};

export const getMe = async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  res.json(user);
};
