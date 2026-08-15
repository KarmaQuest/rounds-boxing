import { NextRequest } from "next/server";
import { getCombatsAvenir, getCombatsRecents } from "@/lib/data";
import { CACHE, clientIp, enforceRateLimit, jsonResponse } from "@/lib/api";

/**
 * GET /api/combats?scope=upcoming|recent
 * - upcoming : combats à venir avec cotes (The Odds API → mock)
 * - recent   : résultats récents (mock / TheSportsDB)
 * Sécurisé : rate limit par IP, erreurs génériques, cache-control.
 */
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request);
  if (limited) return limited;

  const scope = request.nextUrl.searchParams.get("scope") ?? "upcoming";
  const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? 20);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(1, rawLimit), 50) : 20;

  try {
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
