import "server-only";

/**
 * Rate limiter simple (fenêtre glissante, en mémoire).
 *
 * ⚠️ En serverless (Vercel), chaque instance a sa propre mémoire : le
 * comptage est donc « par instance ». C'est un garde-fou efficace contre
 * le scraping/boucles, mais pas un comptage global — pour un vrai rate
 * limit distribué, remplacer par un store partagé (ex. Upstash Ratelimit).
 */

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

function sweep(): void {
  // évite une fuite mémoire : on purge les buckets au-delà de 10 000 clés
  if (buckets.size > 10_000) {
    const now = Date.now();
    for (const [key, b] of buckets) {
      b.timestamps = b.timestamps.filter((t) => now - t < 60_000);
      if (b.timestamps.length === 0) buckets.delete(key);
    }
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

/** Fenêtre glissante : limite d'appels par `windowMs`. */
export function rateLimit(
  key: string,
  limit = Number(process.env.RATE_LIMIT_PER_MIN ?? 120),
  windowMs = 60_000
): RateLimitResult {
  sweep();
  const now = Date.now();
  const bucket = buckets.get(key) ?? { timestamps: [] };

  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  if (bucket.timestamps.length >= limit) {
    buckets.set(key, bucket);
    return {
      ok: false,
      remaining: 0,
      resetAt: bucket.timestamps[0]! + windowMs,
    };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return { ok: true, remaining: limit - bucket.timestamps.length, resetAt: now + windowMs };
}
