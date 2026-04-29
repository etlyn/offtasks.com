export const MIN_PASSWORD_LENGTH = 8;

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const mapAuthErrorMessage = (raw: string): string => {
  const normalized = raw.toLowerCase();

  if (normalized.includes("email not confirmed")) {
    return "Confirm your email from the signup message before signing in.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "We couldn't find a matching account. Double-check your email and password.";
  }

  if (normalized.includes("too many requests")) {
    return "Too many attempts in a short period. Wait a moment and try again.";
  }

  if (normalized.includes("user already registered")) {
    return "An account with this email already exists. Sign in instead.";
  }

  if (normalized.includes("invalid email")) {
    return "Enter a valid email address.";
  }

  if (normalized.includes("password should be at least")) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`;
  }

  if (normalized.includes("expired") || normalized.includes("invalid grant")) {
    return "This link is no longer valid. Request a fresh one and try again.";
  }

  return raw;
};

export const getPasswordValidationError = (password: string): string | null => {
  if (!password.trim()) {
    return "Enter a password to continue.";
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`;
  }

  return null;
};

export const getPasswordChecklist = (password: string) => [
  {
    label: `At least ${MIN_PASSWORD_LENGTH} characters`,
    satisfied: password.length >= MIN_PASSWORD_LENGTH,
  },
  {
    label: "Add a number or symbol for extra protection",
    satisfied: /[\d\W]/.test(password),
  },
];

export interface AuthUrlParams {
  accessToken: string | null;
  refreshToken: string | null;
  type: string | null;
  errorDescription: string | null;
}

export const getAuthUrlParams = (): AuthUrlParams => {
  if (typeof window === "undefined") {
    return {
      accessToken: null,
      refreshToken: null,
      type: null,
      errorDescription: null,
    };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(hash);

  return {
    accessToken: hashParams.get("access_token") ?? searchParams.get("access_token"),
    refreshToken: hashParams.get("refresh_token") ?? searchParams.get("refresh_token"),
    type: hashParams.get("type") ?? searchParams.get("type"),
    errorDescription:
      hashParams.get("error_description") ?? searchParams.get("error_description"),
  };
};