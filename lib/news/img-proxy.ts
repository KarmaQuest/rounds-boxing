/**
 * Proxy d'images des sources d'actualités.
 *
 * World Boxing News protège ses images avec un blocage INTERMITTENT :
 * le premier accès passe, puis une rafale de requêtes déclenche un
 * cooldown (403 pendant ~1 min). Le navigateur, lui, ne fait qu'un seul
 * essai → vignette cassée.
 *
 * Stratégie ici : on sert ces vignettes via /api/img qui
 * 1. met les requêtes vers WBN en FILE (espacées 400 ms, jamais en rafale),
 * 2. RÉESSAIE avec backoff si 403 (le cooldown se lève vite),
 * 3. cache les octets 6 h en mémoire → ~7 requêtes WBN toutes les 6 h.
 *
 * L'allowlist d'hôtes évite de transformer la route en open proxy.
 */

/**
 * UA court OBLIGATOIRE : la WAF de World Boxing News renvoie 403 aux
 * User-Agents longs (testé : UA complet Chrome → 403 systématique,
 * « Mozilla/5.0 » → 200 systématique). Le navigateur, lui, ne contacte
 * jamais WBN directement : il charge les vignettes depuis /api/img.
 */
const UA = "Mozilla/5.0";

/** Hôtes dont les images passent par le proxy. */
export const PROXY_IMAGE_HOSTS = new Set([
  "www.worldboxingnews.com",
  "worldboxingnews.com",
]);

const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 h
const QUEUE_GAP_MS = 400; // espacement entre deux requêtes WBN
const RETRIES = 3;
const RETRY_BACKOFF_MS = 800;

interface CachedImage {
  data: Buffer;
  type: string;
  expiresAt: number;
}

const imageCache = new Map<string, CachedImage>();

/**
 * Réécrit une URL de vignette vers /api/img si son hôte est protégé,
 * sinon la laisse telle quelle.
 */
export function proxyImageUrl(url: string): string {
  try {
    const host = new URL(url).hostname;
    if (PROXY_IMAGE_HOSTS.has(host)) {
      return `/api/img?url=${encodeURIComponent(url)}`;
    }
  } catch {
    // URL invalide → on la laisse, la carte gérera l'erreur
  }
  return url;
}

// File d'attente par hôte : on ne bombarde jamais une source protégée.
const hostQueues = new Map<string, Promise<unknown>>();

function enqueue(host: string, task: () => Promise<void>): Promise<void> {
  const prev = hostQueues.get(host) ?? Promise.resolve();
  const next = prev
    .catch(() => {})
    .then(
      () =>
        new Promise<void>((resolve) =>
          setTimeout(() => task().finally(resolve), QUEUE_GAP_MS)
        )
    );
  hostQueues.set(host, next);
  return next;
}

/** Un essai de fetch d'image, avec le jeu d'en-têtes qui passe le blocage. */
async function fetchOnce(url: string): Promise<{ data: Buffer; type: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return null; // page d'erreur HTML → non
    return { data: Buffer.from(await res.arrayBuffer()), type };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Récupère (file + retries + cache) les octets d'une image protégée. */
export async function fetchProxiedImage(url: string): Promise<{ data: Buffer; type: string } | null> {
  const cached = imageCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return { data: cached.data, type: cached.type };
  }

  const host = new URL(url).hostname;
  // holder mutable : évite le narrowing TS dans la closure de la file
  const holder: { value: { data: Buffer; type: string } | null } = { value: null };

  await enqueue(host, async () => {
    for (let attempt = 1; attempt <= RETRIES; attempt++) {
      const result = await fetchOnce(url);
      if (result) {
        holder.value = result;
        break;
      }
      // 403 temporaire → on attend le cooldown puis on réessaie
      if (attempt < RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS * attempt));
      }
    }
  });

  if (holder.value) {
    imageCache.set(url, {
      data: holder.value.data,
      type: holder.value.type,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return holder.value;
  }
  return null;
}
