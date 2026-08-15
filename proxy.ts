import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * Proxy Next 16 (ex-middleware) — garde d'accès au dashboard.
 *
 * ⚠️ Le proxy tourne dans un environnement séparé du code de rendu : on
 * vérifie ici UNIQUEMENT le jeton JWT (stateless, via jose — compatible
 * edge), sans toucher à la base SQLite. La page /dashboard refait un
 * contrôle serveur complet (getCurrentUser) pour la robustesse.
 */

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const secret = process.env.JWT_SECRET ?? "rounds-dev-secret-change-me";
  try {
    await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/dashboard") && !(await hasValidSession(request))) {
    const login = new URL("/connexion", request.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
