import { NextRequest } from "next/server";
import { enforceRateLimit, jsonResponse } from "@/lib/api";
import { fetchNews } from "@/lib/news";
import type { NewsFilter } from "@/lib/news/types";

const VALID_TYPES: NewsFilter[] = ["all", "articles", "videos"];

/** GET /api/news?type=all|articles|videos&limit=N — dernières actualités boxe. */
export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req);
  if (limited) return limited;

  const type = (req.nextUrl.searchParams.get("type") ?? "all") as NewsFilter;
  if (!VALID_TYPES.includes(type)) {
    return jsonResponse(
      { error: "Paramètre type invalide (all | articles | videos)." },
      { status: 400 }
    );
  }

  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 12);
  if (!Number.isFinite(limit) || limit < 1 || limit > 50) {
    return jsonResponse(
      { error: "Paramètre limit invalide (1 à 50)." },
      { status: 400 }
    );
  }

  const items = await fetchNews(type, limit);
  return jsonResponse(
    { items, updatedAt: new Date().toISOString() },
    { cache: "public, s-maxage=600, stale-while-revalidate=60" }
  );
}
