import { NextRequest } from "next/server";
import { enforceRateLimit, jsonResponse } from "@/lib/api";
import { fetchNews } from "@/lib/news";
import type { NewsFilter, NewsQuery } from "@/lib/news/types";

const VALID_TYPES: NewsFilter[] = ["all", "articles", "videos"];
const VALID_SORTS: NewsQuery["sort"][] = ["asc", "desc"];

/**
 * GET /api/news?type=all|articles|videos&q=&source=&sort=&offset=&limit=
 * Actualités boxe paginées, avec recherche floue et filtre par source.
 * Réponse : { items, total, hasMore, updatedAt }.
 */
export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req);
  if (limited) return limited;

  const sp = req.nextUrl.searchParams;
  const type = (sp.get("type") ?? "all") as NewsFilter;
  if (!VALID_TYPES.includes(type)) {
    return jsonResponse(
      { error: "Paramètre type invalide (all | articles | videos)." },
      { status: 400 }
    );
  }

  const sort = (sp.get("sort") ?? "desc") as NewsQuery["sort"];
  if (!VALID_SORTS.includes(sort)) {
    return jsonResponse(
      { error: "Paramètre sort invalide (asc | desc)." },
      { status: 400 }
    );
  }

  const q = sp.get("q")?.trim().slice(0, 60) || undefined;
  const source = sp.get("source")?.trim().slice(0, 40) || undefined;

  const limit = Number(sp.get("limit") ?? 24);
  if (!Number.isFinite(limit) || limit < 1 || limit > 50) {
    return jsonResponse(
      { error: "Paramètre limit invalide (1 à 50)." },
      { status: 400 }
    );
  }
  const offset = Number(sp.get("offset") ?? 0);
  if (!Number.isFinite(offset) || offset < 0) {
    return jsonResponse(
      { error: "Paramètre offset invalide (≥ 0)." },
      { status: 400 }
    );
  }

  const page = await fetchNews({ type, q, source, sort, offset, limit });
  return jsonResponse(page, {
    cache: "public, s-maxage=600, stale-while-revalidate=60",
  });
}
