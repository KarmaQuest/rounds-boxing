import "server-only";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { findUserById, type DbUser } from "./db";
import { verifySession } from "./jwt";
import { SESSION_COOKIE } from "./constants";

/** Lit le jeton depuis les cookies (route handler ou page serveur). */
export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/**
 * Résout l'utilisateur courant depuis la requête (proxy) ou les cookies
 * (page/route). Retourne null si non connecté ou jeton invalide.
 */
export async function getCurrentUser(
  req?: NextRequest
): Promise<DbUser | null> {
  const token = req ? req.cookies.get(SESSION_COOKIE)?.value : await getSessionToken();
  const payload = await verifySession(token);
  if (!payload) return null;
  const user = findUserById(Number(payload.sub));
  return user ?? null;
}

/** Payload « public » renvoyé au client (jamais le hash). */
export function publicUser(user: DbUser) {
  return { id: user.id, email: user.email, createdAt: user.created_at };
}
