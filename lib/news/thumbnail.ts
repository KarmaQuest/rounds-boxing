import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { createHash } from "crypto";
import type { NewsItem } from "./types";

/**
 * Miniatures des articles d'actualités.
 *
 * Stratégie en cascade, résolue à la demande via `/api/news/thumb/[hash]` :
 * 1. image déjà fournie par le flux RSS/Atom (media:content, enclosure, 1re
 *    <img> du résumé — voir parse.ts) → on n'a rien à faire ;
 * 2. sinon, on récupère l'`og:image` de la page article (fiable, aucun
 *    quota) ;
 * 3. sinon, on génère une miniature avec l'IA (Gemini image, si la clé et
 *    le quota le permettent) ;
 * 4. sinon → 404, le client affiche le fallback dégradé néon.
 *
 * Chaque résolution est mise en cache sur disque (`.data/news-thumbs/`) :
 * la page n'est fetchée / l'image générée qu'UNE seule fois par article.
 * `.data/` est gitignoré (même emplacement que quota.json / rounds.db).
 */

/** Clé de cache stable : hash du couple sourceId + titre (l'URL des flux
 *  peut varier entre deux polls, le titre reste le même). */
export function thumbHash(item: { sourceId: string; title: string }): string {
  return createHash("sha1")
    .update(`${item.sourceId}:${item.title}`)
    .digest("hex")
    .slice(0, 16);
}

/** URL locale qui déclenche la résolution (cache disque → og:image → IA). */
export function thumbUrl(item: NewsItem): string {
  const hash = thumbHash(item);
  const params = new URLSearchParams({
    url: item.url,
    title: item.title,
    source: item.sourceId,
  });
  if (item.description) params.set("desc", item.description.slice(0, 300));
  return `/api/news/thumb/${hash}?${params.toString()}`;
}

const THUMB_DIR = path.join(process.cwd(), ".data", "news-thumbs");
const FETCH_TIMEOUT_MS = 6000;
// Durée de mise en cache d'un échec de résolution : évite de re-tenter
// og:image + IA pour chaque chargement quand la page 403 ou le quota
// Gemini est épuisé (429) — le prochain essai réel se fera après ce délai.
const FAIL_TTL_MS = 30 * 60_000;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

async function ensureDir(): Promise<void> {
  await fs.mkdir(THUMB_DIR, { recursive: true });
}

/** Contenu d'une image mise en cache, ou null. */
export async function getCachedThumb(
  hash: string
): Promise<{ data: Buffer; type: string } | null> {
  try {
    const data = await fs.readFile(path.join(THUMB_DIR, `${hash}.img`));
    const type = await fs
      .readFile(path.join(THUMB_DIR, `${hash}.type`), "utf-8")
      .catch(() => "image/png");
    return { data, type };
  } catch {
    return null;
  }
}

async function saveThumb(hash: string, data: Buffer, type: string): Promise<void> {
  await ensureDir();
  await fs.writeFile(path.join(THUMB_DIR, `${hash}.img`), data);
  await fs.writeFile(path.join(THUMB_DIR, `${hash}.type`), type);
}

/** Un échec récent (≤ 30 min) est-il en cache ? Si oui, on ne re-tente pas. */
async function hasRecentFailure(hash: string): Promise<boolean> {
  try {
    const raw = await fs.readFile(path.join(THUMB_DIR, `${hash}.fail`), "utf-8");
    return Date.now() - Number(raw) < FAIL_TTL_MS;
  } catch {
    return false;
  }
}

async function markFailure(hash: string): Promise<void> {
  await ensureDir();
  await fs.writeFile(path.join(THUMB_DIR, `${hash}.fail`), String(Date.now()));
}

async function fetchText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA },
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

async function fetchBytes(url: string): Promise<{ data: Buffer; type: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 100) return null; // image vide / erreur HTML
    return {
      data: buf,
      type: res.headers.get("content-type")?.split(";")[0] ?? "image/jpeg",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** og:image (ou twitter:image) de la page article, si présente. */
async function ogImageOf(url: string): Promise<string | null> {
  const html = await fetchText(url);
  if (!html) return null;

  const metas = [
    ...html.matchAll(/<meta[^>]+property=["']og:image["'][^>]*>/gi),
    ...html.matchAll(/<meta[^>]+name=["']twitter:image["'][^>]*>/gi),
  ];
  for (const m of metas) {
    const content = m[0]?.match(/content=["']([^"']+)["']/i)?.[1];
    if (content && /^https?:\/\//i.test(content)) return content;
  }

  // og:image sans quote (format rare mais existant)
  const loose = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=([^ >]+)/i);
  if (loose?.[1]?.startsWith("http")) return loose[1];

  return null;
}

/** Génère une miniature via l'API Gemini image. Retourne null si quota/clé absents. */
async function generateWithGemini(item: {
  title: string;
  description?: string;
  source: string;
}): Promise<{ data: Buffer; type: string } | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const prompt =
    `Miniature d'article de boxe au style "dark néon" (fond sombre, accents rouges et or, ambiance spectaculaire de ring de boxe). ` +
    `Titre : « ${item.title} ». ` +
    (item.description
      ? `Contexte : ${item.description.slice(0, 180)}. `
      : "") +
    `Source : ${item.source}. Pas de texte long sur l'image, format paysage 16:9.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { imageConfig: { aspectRatio: "16:9" } },
        }),
        cache: "no-store",
      }
    );
    if (!res.ok) return null; // quota épuisé (429), modèle indisponible, etc.

    const json = (await res.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }>;
        };
      }>;
    };
    const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!part?.inlineData?.data) return null;

    return {
      data: Buffer.from(part.inlineData.data, "base64"),
      type: part.inlineData.mimeType ?? "image/png",
    };
  } catch {
    return null;
  }
}

/**
 * Résout la miniature d'un article : cache disque → og:image → IA.
 * Retourne null si aucune image n'a pu être obtenue (le client bascule
 * alors sur le fallback dégradé néon).
 */
export async function resolveArticleThumb(
  hash: string,
  url: string,
  item: Pick<NewsItem, "title" | "description" | "source">
): Promise<{ data: Buffer; type: string } | null> {
  const cached = await getCachedThumb(hash);
  if (cached) return cached;

  // échec récent en cache (403 persistant, quota IA épuisé) → on ne
  // re-tape pas les APIs pour chaque chargement de page
  if (await hasRecentFailure(hash)) return null;

  // 1. og:image de la page (fiable, zéro quota)
  const ogUrl = await ogImageOf(url);
  if (ogUrl) {
    const img = await fetchBytes(ogUrl);
    if (img) {
      await saveThumb(hash, img.data, img.type);
      return img;
    }
  }

  // 2. génération IA (Gemini image) — seulement si clé + quota dispo
  const ai = await generateWithGemini(item);
  if (ai) {
    await saveThumb(hash, ai.data, ai.type);
    return ai;
  }

  await markFailure(hash);
  return null;
}
