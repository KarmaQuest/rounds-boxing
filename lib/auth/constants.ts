/**
 * Constantes partagées de la session — volontairement SANS dépendances
 * (pas de "server-only", pas de base de données) pour être importables
 * depuis le proxy (environnement séparé).
 */
export const SESSION_COOKIE = "rounds_session";

/** Durée de vie du jeton (7 jours — phase de test). */
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
