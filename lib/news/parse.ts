import { XMLParser } from "fast-xml-parser";
import type { ArticleSource, VideoSource } from "./sources";
import type { NewsItem } from "./types";

/**
 * Parsing des flux RSS 2.0 (<item>), Atom (<entry>) et YouTube
 * (<entry> + media:group). fast-xml-parser v5 : attributs préfixés « @_ »,
 * namespaces conservés (« media:group »), un seul enfant → objet (pas tableau).
 */

const parser = new XMLParser({
  ignoreAttributes: false,
  // on ne veut jamais de nombres/conversions : tout est du texte
  parseTagValue: false,
  parseAttributeValue: false,
});

type Xml = Record<string, unknown>;

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function asStr(value: unknown): string {
  if (typeof value === "string") return value;
  // nœud avec attributs : fast-xml-parser renvoie { "#text": ... }
  if (typeof value === "object" && value !== null) {
    const text = (value as Record<string, unknown>)["#text"];
    if (typeof text === "string") return text;
  }
  return "";
}

/** Retire le HTML (balises + entités communes) d'un résumé. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&hellip;/g, "…")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string, max = 220): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

function normalizeDate(value: unknown): string {
  const s = asStr(value);
  if (!s) return "";
  const date = new Date(s);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

/** Item RSS 2.0 (<rss><channel><item>). */
function parseRssItems(xml: string, source: ArticleSource): NewsItem[] {
  const root = parser.parse(xml) as Xml;
  const channel = (root.rss as Xml | undefined)?.channel as Xml | undefined;
  const items = asArray<Xml>(channel?.item as Xml | Xml[] | undefined);

  return items
    .map((item): NewsItem | null => {
      const title = asStr(item.title).trim();
      const url = asStr(item.link).trim();
      const publishedAt = normalizeDate(item.pubDate ?? item["dc:date"]);
      if (!title || !url) return null;
      return {
        type: "article",
        id: url,
        title,
        url,
        source: source.name,
        sourceId: source.id,
        publishedAt: publishedAt || new Date(0).toISOString(),
        description: truncate(stripHtml(asStr(item.description))),
      };
    })
    .filter((x): x is NewsItem => x !== null);
}

/** Item Atom (<feed><entry>, lien dans <link href>). */
function parseAtomItems(xml: string, source: ArticleSource): NewsItem[] {
  const root = parser.parse(xml) as Xml;
  const feed = root.feed as Xml | undefined;
  const entries = asArray<Xml>(feed?.entry as Xml | Xml[] | undefined);

  return entries
    .map((entry): NewsItem | null => {
      const title = asStr(entry.title).trim();
      const link = asStr((entry.link as Xml | undefined)?.["@_href"]).trim();
      const publishedAt = normalizeDate(entry.published ?? entry.updated);
      if (!title || !link) return null;
      return {
        type: "article",
        id: link,
        title,
        url: link,
        source: source.name,
        sourceId: source.id,
        publishedAt: publishedAt || new Date(0).toISOString(),
        description: truncate(stripHtml(asStr(entry.summary ?? entry.content))),
      };
    })
    .filter((x): x is NewsItem => x !== null);
}

/** Flux YouTube videos.xml (<feed><entry> + media:group). */
function parseYtItems(xml: string, source: VideoSource): NewsItem[] {
  const root = parser.parse(xml) as Xml;
  const feed = root.feed as Xml | undefined;
  const entries = asArray<Xml>(feed?.entry as Xml | Xml[] | undefined);

  return entries
    .map((entry): NewsItem | null => {
      const videoId = asStr(entry["yt:videoId"]).trim();
      const title = asStr(entry.title).trim();
      const publishedAt = normalizeDate(entry.published);
      if (!videoId || !title) return null;

      const mediaGroup = entry["media:group"] as Xml | undefined;
      const thumbnailUrl = asStr(
        (mediaGroup?.["media:thumbnail"] as Xml | undefined)?.["@_url"]
      );

      return {
        type: "video",
        id: videoId,
        title,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        source: source.name,
        sourceId: source.id,
        publishedAt: publishedAt || new Date(0).toISOString(),
        thumbnail: thumbnailUrl || undefined,
        description: truncate(
          stripHtml(asStr(mediaGroup?.["media:description"])),
          160
        ),
      };
    })
    .filter((x): x is NewsItem => x !== null);
}

export function parseArticleFeed(
  xml: string,
  source: ArticleSource
): NewsItem[] {
  try {
    return source.atom ? parseAtomItems(xml, source) : parseRssItems(xml, source);
  } catch {
    return [];
  }
}

export function parseVideoFeed(xml: string, source: VideoSource): NewsItem[] {
  try {
    return parseYtItems(xml, source);
  } catch {
    return [];
  }
}
