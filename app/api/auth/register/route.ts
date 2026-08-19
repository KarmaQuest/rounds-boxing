import { NextRequest } from "next/server";
import { createUser, findUserByEmail } from "@/lib/auth/db";
import { hashPassword } from "@/lib/auth/password";
import { signSession } from "@/lib/auth/jwt";
import { SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/auth/constants";
import { publicUser } from "@/lib/auth/session";
import { clientIp, enforceRateLimit, jsonResponse } from "@/lib/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/register { email, password }
 * Crée le compte, connecte (cookie httpOnly), renvoie l'utilisateur public.
 */
export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request);
  if (limited) return limited;

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Corps de requête invalide.", errorCode: "invalidBody" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!EMAIL_RE.test(email)) {
    return jsonResponse({ error: "Adresse email invalide.", errorCode: "invalidEmail" }, { status: 400 });
  }
  if (password.length < 8) {
    return jsonResponse(
      { error: "Le mot de passe doit faire au moins 8 caractères.", errorCode: "passwordTooShort" },
      { status: 400 }
    );
  }
  if (findUserByEmail(email)) {
    return jsonResponse(
      { error: "Un compte existe déjà avec cet email.", errorCode: "emailExists" },
      { status: 409 }
    );
  }

  const user = createUser(email, hashPassword(password));
  const token = await signSession({ sub: String(user.id), email: user.email });

  const res = jsonResponse({ user: publicUser(user) }, { status: 201 });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  console.log(`[auth] inscription : ${email} (${clientIp(request)})`);
  return res;
}
