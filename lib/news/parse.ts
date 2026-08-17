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

/**
 * Décode les entités HTML : références numériques (&#8216;, &#x2018;) et
 * entités nommées courantes. Les flux WordPress encodent les guillemets
 * typographiques en entités numériques (&amp;#8220;… dans le XML, qui
 * devient &#8220; après décodage XML) — sans cette étape, les titres
 * afficheraient « &#8216; » en toutes lettres.
 *
 * &amp; est traité en dernier : un `&amp;#8216;` du flux devient `&#8216;`
 * puis `‘`, alors qu'un `&amp;` destiné à rester « & » n'est pas re-échappé.
 */
export function decodeEntities(text: string): string {
  const fromCodePoint = (s: string, base: number, raw: string): string => {
    const cp = Number.parseInt(s, base);
    if (Number.isNaN(cp) || cp < 0 || cp > 0x10ffff) return raw;
    return String.fromCodePoint(cp);
  };

  return text
    .replace(/&#x([0-9a-f]+);/gi, (raw, hex: string) => fromCodePoint(hex, 16, raw))
    .replace(/&#(\d+);/g, (raw, dec: string) => fromCodePoint(dec, 10, raw))
    .replace(/&hellip;/g, "…")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Retire le HTML (balises + entités) d'un résumé. */
export function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/** Première image d'un contenu HTML (src du premier <img>), si présente. */
export function firstImage(html: string): string | undefined {
  const match = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  if (!match) return undefined;
  const src = match[1]!.trim();
  if (!src) return undefined;
  // on ne garde que http(s) — les data:/blob: casseraient la carte
  return /^https?:\/\//i.test(src) ? src : undefined;
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
      const title = decodeEntities(asStr(item.title).trim());
      const url = asStr(item.link).trim();
      const publishedAt = normalizeDate(item.pubDate ?? item["dc:date"]);
      if (!title || !url) return null;

      const rawDescription = asStr(item.description);

      // Extraction de l'image (media:content, media:thumbnail, enclosure,
      // puis 1re image du contenu HTML — les flux WordPress mettent souvent
      // la miniature dans le <description>)
      let thumbnail: string | undefined;
      const mediaContent = item["media:content"] as Xml | undefined;
      const mediaThumbnail = item["media:thumbnail"] as Xml | undefined;
      const enclosure = item.enclosure as Xml | undefined;
      
      if (mediaThumbnail) {
        thumbnail = asStr(mediaThumbnail["@_url"]).trim();
      } else if (mediaContent) {
        thumbnail = asStr(mediaContent["@_url"]).trim();
      } else if (enclosure && asStr(enclosure["@_type"]).startsWith("image/")) {
        thumbnail = asStr(enclosure["@_url"]).trim();
      } else {
        thumbnail = firstImage(rawDescription);
      }

      return {
        type: "article",
        id: url,
        title,
        url,
        source: source.name,
        sourceId: source.id,
        publishedAt: publishedAt || new Date(0).toISOString(),
        description: truncate(stripHtml(rawDescription)),
        thumbnail: thumbnail || undefined,
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
      const title = decodeEntities(asStr(entry.title).trim());
      const link = asStr((entry.link as Xml | undefined)?.["@_href"]).trim();
      const publishedAt = normalizeDate(entry.published ?? entry.updated);
      if (!title || !link) return null;

      const rawSummary = asStr(entry.summary ?? entry.content);

      // image : media:thumbnail/thumbnail Atom, sinon 1re image du résumé
      let thumbnail = asStr(
        (entry["media:thumbnail"] as Xml | undefined)?.["@_url"]
      ).trim();
      if (!thumbnail) {
        thumbnail = asStr((entry.thumbnail as Xml | undefined)?.["@_url"]).trim();
      }
      if (!thumbnail) {
        thumbnail = firstImage(rawSummary) ?? "";
      }

      return {
        type: "article",
        id: link,
        title,
        url: link,
        source: source.name,
        sourceId: source.id,
        publishedAt: publishedAt || new Date(0).toISOString(),
        description: truncate(stripHtml(rawSummary)),
        thumbnail: thumbnail || undefined,
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
      const title = decodeEntities(asStr(entry.title).trim());
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
        // fallback i.ytimg.com : miniature officielle toujours dispo même
        // si le flux ne fournit pas media:thumbnail
        thumbnail: thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
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
