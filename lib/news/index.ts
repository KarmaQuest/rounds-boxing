import "server-only";
import { cache } from "@/lib/data/cache";
import { ARTICLE_SOURCES, VIDEO_CHANNELS } from "./sources";
import { parseArticleFeed, parseVideoFeed } from "./parse";
import { applyNewsQuery } from "./filter";
import type { NewsFilter, NewsItem, NewsPage, NewsQuery } from "./types";

/**
 * Agrégateur d'actualités.
 *
 * 1. La liste COMPLÈTE (toutes sources, triée par date) est mise en cache
 *    15 min par type — les flux amont ne sont pas re-fetchés à chaque page.
 * 2. `fetchNews(query)` applique filtres (type, recherche floue, source),
 *    tri et pagination SUR la liste en cache, à la volée.
 *
 * Tolérant aux pannes : une source qui échoue (timeout 8 s, erreur) est
 * sautée sans jamais faire planter la page.
 */

const NEWS_TTL_MS = 1000 * 60 * 15; // 15 min
const FETCH_TIMEOUT_MS = 8000;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

async function fetchText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "application/rss+xml, application/xml, text/xml, */*" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Liste complète (toutes sources confondues) pour un type, en cache. */
async function getAllItems(type: NewsFilter): Promise<NewsItem[]> {
  const cacheKey = `news:full:${type}`;

  const cached = await cache.get<NewsItem[]>(cacheKey);
  if (cached) return cached;

  const tasks: Array<Promise<NewsItem[]>> = [];

  if (type !== "videos") {
    for (const source of ARTICLE_SOURCES) {
      tasks.push(
        fetchText(source.url).then(
          (xml) => (xml ? parseArticleFeed(xml, source) : [])
        )
      );
    }
  }
  if (type !== "articles") {
    for (const channel of VIDEO_CHANNELS) {
      const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.channelId}`;
      tasks.push(
        fetchText(url).then((xml) => (xml ? parseVideoFeed(xml, channel) : []))
      );
    }
  }

  const results = await Promise.all(tasks);
  const items = results
    .flat()
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  // on ne cache jamais un agrégat vide (sinon les pannes réseau
  // « cacheraient » une page sans actualités pendant 15 min)
  if (items.length > 0) {
    await cache.set(cacheKey, items, NEWS_TTL_MS);
  }

  return items;
}

/** Page d'actualités (filtres + pagination) pour la page /actualites. */
export async function fetchNews(query: NewsQuery): Promise<NewsPage> {
  const items = await getAllItems(query.type);
  return applyNewsQuery(items, query);
}
