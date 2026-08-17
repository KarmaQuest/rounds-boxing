import { NextRequest } from "next/server";
import {
  getCombatsAvenir,
  getCombatsRecents,
  getProgrammation,
} from "@/lib/data";
import { CACHE, clientIp, enforceRateLimit, jsonResponse } from "@/lib/api";

/**
 * GET /api/combats?scope=upcoming|recent|programmation
 * - upcoming      : combats à venir avec cotes (The Odds API → mock)
 * - recent        : résultats récents (mock / TheSportsDB)
 * - programmation : combats à venir PAR ORGANISATION (calendriers
 *   officiels du pipeline, vérifiés par IA — zéro mock, zéro cotes)
 * Sécurisé : rate limit par IP, erreurs génériques, cache-control.
 */
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request);
  if (limited) return limited;

  const scope = request.nextUrl.searchParams.get("scope") ?? "upcoming";
  const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? 20);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(1, rawLimit), 50) : 20;

  try {
    if (scope === "programmation") {
      const data = await getProgrammation();
      return jsonResponse(data, { cache: "public, s-maxage=600, stale-while-revalidate=60" });
    }
    if (scope === "recent") {
      const { fights, source } = await getCombatsRecents(limit);
      return jsonResponse({ fights, source, count: fights.length }, { cache: CACHE.fighters });
    }
    const { fights, source } = await getCombatsAvenir(limit);
    return jsonResponse({ fights, source, count: fights.length }, { cache: CACHE.fights });
  } catch (err) {
    console.error("[api/combats]", scope, clientIp(request), err);
    return jsonResponse(
      { error: "Service temporairement indisponible. Réessaie dans un instant." },
      { status: 503 }
    );
  }
}
