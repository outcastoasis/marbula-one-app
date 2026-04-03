const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/;
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const REALNAME_MIN_LENGTH = 2;
const REALNAME_MAX_LENGTH = 80;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72;

function createValidationError(message, code, field, status = 400) {
  return { message, code, field, status };
}

export function normalizeUsername(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeRealname(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export function validateUsername(username) {
  if (!username) {
    return createValidationError(
      "Bitte Benutzernamen eingeben.",
      "VALIDATION_USERNAME_REQUIRED",
      "username",
    );
  }

  if (username.length < USERNAME_MIN_LENGTH) {
    return createValidationError(
      `Benutzername muss mindestens ${USERNAME_MIN_LENGTH} Zeichen lang sein.`,
      "VALIDATION_USERNAME_TOO_SHORT",
      "username",
    );
  }

  if (username.length > USERNAME_MAX_LENGTH) {
    return createValidationError(
      `Benutzername darf höchstens ${USERNAME_MAX_LENGTH} Zeichen lang sein.`,
      "VALIDATION_USERNAME_TOO_LONG",
      "username",
    );
  }

  if (!USERNAME_PATTERN.test(username)) {
    return createValidationError(
      "Benutzername darf nur Buchstaben, Zahlen, Punkt, Unterstrich und Bindestrich enthalten.",
      "VALIDATION_USERNAME_INVALID_FORMAT",
      "username",
    );
  }

  return null;
}

export function validateRealname(realname) {
  if (!realname) {
    return createValidationError(
      "Bitte einen Namen eingeben.",
      "VALIDATION_REALNAME_REQUIRED",
      "realname",
    );
  }

  if (realname.length < REALNAME_MIN_LENGTH) {
    return createValidationError(
      `Name muss mindestens ${REALNAME_MIN_LENGTH} Zeichen lang sein.`,
      "VALIDATION_REALNAME_TOO_SHORT",
      "realname",
    );
  }

  if (realname.length > REALNAME_MAX_LENGTH) {
    return createValidationError(
      `Name darf höchstens ${REALNAME_MAX_LENGTH} Zeichen lang sein.`,
      "VALIDATION_REALNAME_TOO_LONG",
      "realname",
    );
  }

  return null;
}

export function validatePassword(password) {
  if (typeof password !== "string" || password.length === 0) {
    return createValidationError(
      "Bitte Passwort eingeben.",
      "VALIDATION_PASSWORD_REQUIRED",
      "password",
    );
  }

  if (password.trim().length === 0) {
    return createValidationError(
      "Passwort darf nicht nur aus Leerzeichen bestehen.",
      "VALIDATION_PASSWORD_BLANK",
      "password",
    );
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return createValidationError(
      `Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen lang sein.`,
      "VALIDATION_PASSWORD_TOO_SHORT",
      "password",
    );
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return createValidationError(
      `Passwort darf höchstens ${PASSWORD_MAX_LENGTH} Zeichen lang sein.`,
      "VALIDATION_PASSWORD_TOO_LONG",
      "password",
    );
  }

  return null;
}

export function validateRegistrationPayload(payload) {
  const username = normalizeUsername(payload?.username);
  const realname = normalizeRealname(payload?.realname);
  const password =
    typeof payload?.password === "string" ? payload.password : "";

  return {
    username,
    realname,
    password,
    error:
      validateUsername(username) ||
      validateRealname(realname) ||
      validatePassword(password),
  };
}

export function validateLoginPayload(payload) {
  const username = normalizeUsername(payload?.username);
  const password =
    typeof payload?.password === "string" ? payload.password : "";

  return {
    username,
    password,
    error:
      (!username &&
        createValidationError(
          "Bitte Benutzernamen eingeben.",
          "VALIDATION_USERNAME_REQUIRED",
          "username",
        )) ||
      (password.length === 0 &&
        createValidationError(
          "Bitte Passwort eingeben.",
          "VALIDATION_PASSWORD_REQUIRED",
          "password",
        )) ||
      null,
  };
}

export function buildErrorResponse(error) {
  return {
    message: error.message,
    code: error.code,
    field: error.field,
  };
}
