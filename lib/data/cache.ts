import "server-only";
import { Redis } from "@upstash/redis";

/**
 * Cache TTL — abstrait pour être indépendant du runtime :
 * - mémoire (défaut) : parfait en dev / VM / container (Node long-running) ;
 * - Redis (Upstash) : activé si UPSTASH_REDIS_REST_URL + TOKEN sont présents
 *   → partagé entre toutes les instances serverless (Vercel, etc.).
 *
 * C'est LE levier principal pour rester sous les quotas gratuits :
 * profils 24 h, recherche 1 h, cotes 10 min.
 */

export interface CacheStore {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown, ttlMs: number): Promise<void>;
}

class MemoryCacheStore implements CacheStore {
  private store = new Map<string, { value: unknown; expiresAt: number }>();

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  async set(key: string, value: unknown, ttlMs: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

const REDIS_PREFIX = "rounds:cache:";

class RedisCacheStore implements CacheStore {
  constructor(private redis: Redis) {}

  async get<T>(key: string): Promise<T | undefined> {
    const value = await this.redis.get<T>(REDIS_PREFIX + key);
    return value ?? undefined;
  }

  async set(key: string, value: unknown, ttlMs: number): Promise<void> {
    await this.redis.set(REDIS_PREFIX + key, value, {
      ex: Math.max(1, Math.ceil(ttlMs / 1000)),
    });
  }
}

/** True si les variables Upstash Redis sont configurées. */
function redisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

/** Instancie le store adapté au runtime. */
function createCacheStore(): CacheStore {
  if (redisConfigured()) {
    return new RedisCacheStore(
      new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })
    );
  }
  return new MemoryCacheStore();
}

export const cache: CacheStore = createCacheStore();

/** TTL recommandés par type de donnée. */
export const TTL = {
  fighter: 1000 * 60 * 60 * 24, // 24 h — un profil change rarement
  search: 1000 * 60 * 60, // 1 h
  upcomingFights: 1000 * 60 * 10, // 10 min — les cotes bougent
  recentFights: 1000 * 60 * 60 * 24, // 24 h
  news: 1000 * 60 * 15, // 15 min — les flux d'actualités bougent vite
};
