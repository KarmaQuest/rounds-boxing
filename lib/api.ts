import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "./rate-limit";

/** Extrait l'IP du client (derrière un proxy CDN standard). */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "local";
}

/**
 * Applique le rate limit par IP. Retourne une réponse 429 si dépassé,
 * sinon null (le handler continue).
 */
export function enforceRateLimit(req: NextRequest): NextResponse | null {
  const result = rateLimit(`api:${clientIp(req)}`);

  if (!result.ok) {
    const res = NextResponse.json(
      { error: "Trop de requêtes. Réessaie dans un instant." },
      { status: 429 }
    );
    res.headers.set("Retry-After", String(Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))));
    return res;
  }

  return null;
}

/**
 * Réponse JSON standardisée : cache-control CDN paramétrable + statut.
 * - `public` permet au CDN de servir la réponse (allège les APIs amont).
 * - `noStore` pour les réponses qui ne doivent jamais être cachées.
 */
export function jsonResponse(
  body: unknown,
  opts: { status?: number; cache?: string | null } = {}
): NextResponse {
  const res = NextResponse.json(body, { status: opts.status ?? 200 });
  if (opts.cache !== undefined && opts.cache !== null) {
    res.headers.set("Cache-Control", opts.cache);
  } else if (opts.status && opts.status >= 400) {
    res.headers.set("Cache-Control", "no-store");
  }
  return res;
}

/** Cache-control recommandés par type de donnée. */
export const CACHE = {
  fighters: "public, s-maxage=300, stale-while-revalidate=60",
  fights: "public, s-maxage=60, stale-while-revalidate=30",
};
