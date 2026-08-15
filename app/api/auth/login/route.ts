import { NextRequest } from "next/server";
import { findUserByEmail } from "@/lib/auth/db";
import { verifyPassword } from "@/lib/auth/password";
import { signSession } from "@/lib/auth/jwt";
import { SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/auth/constants";
import { publicUser } from "@/lib/auth/session";
import { enforceRateLimit, jsonResponse } from "@/lib/api";

/**
 * POST /api/auth/login { email, password }
 * Vérifie les identifiants, pose le cookie de session, renvoie l'utilisateur.
 * Rate-limited par IP (anti brute force).
 */
export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request);
  if (limited) return limited;

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  const user = findUserByEmail(email);
  // Réponse identique que l'email existe ou non (pas de fuite d'existence).
  if (!user || !verifyPassword(password, user.password_hash)) {
    return jsonResponse(
      { error: "Email ou mot de passe incorrect." },
      { status: 401 }
    );
  }

  const token = await signSession({ sub: String(user.id), email: user.email });
  const res = jsonResponse({ user: publicUser(user) });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
