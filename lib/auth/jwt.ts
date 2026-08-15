import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { SESSION_TTL_SECONDS } from "./constants";

/**
 * JWT HS256 (jose). Secret via `JWT_SECRET` — en dev on retombe sur un
 * secret local généré aléatoirement à chaque démarrage (session perdue au
 * restart, c'est voulu en test). ⚠️ À renseigner avant tout déploiement.
 */
function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? "rounds-dev-secret-change-me";
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
    console.warn("[auth] JWT_SECRET non défini — utiliser un secret fort en production !");
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  sub: string; // user id
  email: string;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

/** Retourne le payload si le jeton est valide, sinon null. */
export async function verifySession(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") return null;
    return { sub: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}
