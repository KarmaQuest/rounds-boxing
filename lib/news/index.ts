import "server-only";
import { cache } from "@/lib/data/cache";
import { ARTICLE_SOURCES, VIDEO_CHANNELS } from "./sources";
import { parseArticleFeed, parseVideoFeed } from "./parse";
import type { NewsFilter, NewsItem } from "./types";

/**
 * Agrégateur d'actualités : récupère tous les flux (articles + vidéos) en
 * parallèle, normalise, trie par date décroissante. Chaque source est
 * tolérante aux pannes (timeout + erreur → on la saute) : la section
 * actualités ne doit JAMAIS faire planter la page d'accueil.
 *
 * Résultat mis en cache 15 min (mémoire ou Redis selon config).
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

export async function fetchNews(type: NewsFilter, limit: number): Promise<NewsItem[]> {
  const safeLimit = Math.min(Math.max(1, limit), 50);
  const cacheKey = `news:${type}:${safeLimit}`;

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
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, safeLimit);

  // le cache ne stocke jamais un agrégat vide (sinon les pannes réseau
  // « cacheraient » une page sans actualités pendant 15 min)
  if (items.length > 0) {
    await cache.set(cacheKey, items, NEWS_TTL_MS);
  }

  return items;
}
