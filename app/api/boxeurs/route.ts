import { NextRequest } from "next/server";
import { searchBoxeurs } from "@/lib/data";
import { WEIGHT_CLASSES } from "@/lib/data/types";
import type { FighterFilters } from "@/lib/data/types";
import { CACHE, clientIp, enforceRateLimit, jsonResponse } from "@/lib/api";

/**
 * GET /api/boxeurs?q=usyk&weightClass=Poids+lourds&country=Ukraine
 *                   &minWins=20&minKoPct=50&sort=rank&limit=50&offset=24
 *
 * Sécurisé : rate limit par IP, erreurs génériques (aucune fuite interne),
 * cache-control CDN, validation des paramètres (clamps + whitelists).
 */
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request);
  if (limited) return limited;

  const sp = request.nextUrl.searchParams;

  const weightClass = sp.get("weightClass") ?? "";
  const sort = sp.get("sort") ?? "";
  const allowedSorts = ["rank", "wins", "koPct", "name", "age", "height"];
  const rawLimit = Number(sp.get("limit") ?? 300);
  const rawOffset = Number(sp.get("offset") ?? 0);
  const minWins = Number(sp.get("minWins") ?? 0);
  const minKoPct = Number(sp.get("minKoPct") ?? 0);

  const filters: FighterFilters = {
    q: sp.get("q")?.trim().slice(0, 100) || undefined,
    weightClass: (WEIGHT_CLASSES as readonly string[]).includes(weightClass)
      ? (weightClass as (typeof WEIGHT_CLASSES)[number])
      : undefined,
    country: sp.get("country")?.trim().slice(0, 60) || undefined,
    minWins: Number.isFinite(minWins) && minWins > 0 ? Math.min(minWins, 999) : undefined,
    minKoPct: Number.isFinite(minKoPct) && minKoPct > 0 ? Math.min(minKoPct, 100) : undefined,
    sort: allowedSorts.includes(sort) ? (sort as FighterFilters["sort"]) : undefined,
    offset: Number.isFinite(rawOffset) ? Math.min(Math.max(0, rawOffset), 100_000) : 0,
    limit: Number.isFinite(rawLimit) ? Math.min(Math.max(1, rawLimit), 500) : 300,
  };

  try {
    const { fighters, source } = await searchBoxeurs(filters);
    return jsonResponse({ fighters, source, count: fighters.length }, { cache: CACHE.fighters });
  } catch (err) {
    console.error("[api/boxeurs]", clientIp(request), err);
    return jsonResponse(
      { error: "Service temporairement indisponible. Réessaie dans un instant." },
      { status: 503 }
    );
  }
}
