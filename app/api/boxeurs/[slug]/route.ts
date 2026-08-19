import { NextRequest } from "next/server";
import { getBoxeur } from "@/lib/data";
import { CACHE, clientIp, enforceRateLimit, jsonResponse } from "@/lib/api";

/**
 * GET /api/boxeurs/:slug — profil détaillé d'un boxeur.
 * 404 si inconnu, erreurs génériques, rate limit par IP.
 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/boxeurs/[slug]">
) {
  const limited = enforceRateLimit(request);
  if (limited) return limited;

  const { slug } = await ctx.params;

  try {
    const { fighter, source } = await getBoxeur(slug);

    if (!fighter) {
      return jsonResponse({ error: "Boxeur introuvable", errorCode: "notFound" }, { status: 404 });
    }
    return jsonResponse(
      { fighter, source },
      { cache: CACHE.fighters }
    );
  } catch (err) {
    console.error("[api/boxeurs/:slug]", slug, clientIp(request), err);
    return jsonResponse(
      { error: "Service temporairement indisponible. Réessaie dans un instant.", errorCode: "serviceUnavailable" },
      { status: 503 }
    );
  }
}
