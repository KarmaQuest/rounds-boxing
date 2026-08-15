import { fuzzyMatch } from "@/lib/data/utils";
import type { NewsItem, NewsPage, NewsQuery } from "./types";

/**
 * Applique filtres + tri + pagination sur la liste complète des items.
 * Fonction PURE (aucun réseau, aucun cache) — testable unitairement.
 * La recherche est floue sur le titre (typos tolérées, accents ignorés).
 */
export function applyNewsQuery(items: NewsItem[], query: NewsQuery): NewsPage {
  const { type, q, source, sort = "desc", offset, limit } = query;
  const search = q?.trim().toLowerCase() ?? "";

  const filtered = items.filter((item) => {
    if (type === "articles" && item.type !== "article") return false;
    if (type === "videos" && item.type !== "video") return false;
    if (source && item.sourceId !== source) return false;
    if (search && !fuzzyMatch(search, item.title)) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) =>
    sort === "asc"
      ? a.publishedAt.localeCompare(b.publishedAt)
      : b.publishedAt.localeCompare(a.publishedAt)
  );

  const safeOffset = Math.max(0, offset);
  const safeLimit = Math.min(Math.max(1, limit), 50);
  const itemsSlice = sorted.slice(safeOffset, safeOffset + safeLimit);

  return {
    items: itemsSlice,
    total: sorted.length,
    hasMore: safeOffset + itemsSlice.length < sorted.length,
    updatedAt: new Date().toISOString(),
  };
}
