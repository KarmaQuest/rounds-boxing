/**
 * Codes d'erreur stables renvoyés par les routes API (champ `errorCode`) en
 * plus du message français `error`. Le client les mappe vers la langue
 * active via `messages/<locale>.json` (auth.errors.* / api.*).
 */
export const AUTH_ERROR_CODES = [
  "invalidBody",
  "badCredentials",
  "invalidEmail",
  "passwordTooShort",
  "emailExists",
  "wrongCurrentPassword",
  "newPasswordTooShort",
  "notConnected",
] as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

/** Vérifie qu'une valeur est un code d'erreur d'authentification connu. */
export function isAuthErrorCode(value: unknown): value is AuthErrorCode {
  return (
    typeof value === "string" &&
    (AUTH_ERROR_CODES as readonly string[]).includes(value)
  );
}

/** Codes génériques partagés par les autres routes (API + favoris). */
export const API_ERROR_CODES = [
  "rateLimited",
  "serviceUnavailable",
  "invalidType",
  "invalidLimit",
  "notFound",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return (
    typeof value === "string" &&
    (API_ERROR_CODES as readonly string[]).includes(value)
  );
}