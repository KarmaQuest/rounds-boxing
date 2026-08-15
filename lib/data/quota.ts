import "server-only";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Redis } from "@upstash/redis";

/**
 * Suivi du quota quotidien + circuit breaker par fournisseur.
 *
 * Le driver détermine où vivent les compteurs :
 * - mémoire + fichier `.data/quota.json` (flush débouncé) : dev / VM /
 *   container (Node long-running) — contient les infos au fil des restarts ;
 * - Redis (Upstash, INCR + EXPIRE) : partagé entre toutes les instances
 *   serverless → comptage global et race-free, activé par
 *   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
 *
 * Le routeur consulte ce module pour décider quel provider appeler :
 * - quota consommé → on passe au provider suivant
 * - 429 / erreurs répétées → circuit ouvert (provider ignoré X minutes)
 */

export interface QuotaDriver {
  isCircuitOpen(name: string): Promise<boolean>;
  openCircuit(name: string, minutes: number): Promise<void>;
  usedToday(name: string): Promise<number>;
  consume(name: string): Promise<number>;
  recordFailure(name: string): Promise<number>;
  resetFailures(name: string): Promise<void>;
}

// ── Driver mémoire (+ fichier pour la continuité en dev) ───────────────

interface MemoryState {
  used: Record<string, number>;
  circuit: Record<string, number>; // openUntil (timestamp)
  failures: Record<string, number>;
}

// Chemin surchargeable (tests) — par défaut dans .data/ (gitignoré).
const FILE = process.env.QUOTA_FILE ?? join(process.cwd(), ".data", "quota.json");
const FLUSH_MS = 5000;

export class MemoryDriver implements QuotaDriver {
  private used = new Map<string, number>();
  private circuit = new Map<string, number>();
  private failures = new Map<string, number>();
  private day = new Date().toISOString().slice(0, 10);
  private saveTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      // turbopackIgnore : .data/ est de l'état runtime, pas du code à tracer
      const raw = JSON.parse(readFileSync(/* turbopackIgnore: true */ FILE, "utf8")) as {
        day?: string;
        state?: MemoryState;
      };
      if (raw.day === this.day && raw.state) {
        this.used = new Map(Object.entries(raw.state.used));
        this.circuit = new Map(Object.entries(raw.state.circuit).map(([k, v]) => [k, Number(v)]));
        this.failures = new Map(Object.entries(raw.state.failures).map(([k, v]) => [k, Number(v)]));
      }
    } catch {
      // premier lancement : rien à charger
    }
  }

  private scheduleSave(): void {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.save();
    }, FLUSH_MS);
    this.saveTimer.unref?.();
  }

  private save(): void {
    try {
      mkdirSync(/* turbopackIgnore: true */ join(process.cwd(), ".data"), { recursive: true });
      writeFileSync(
        /* turbopackIgnore: true */ FILE,
        JSON.stringify(
          {
            day: this.day,
            state: {
              used: Object.fromEntries(this.used),
              circuit: Object.fromEntries(this.circuit),
              failures: Object.fromEntries(this.failures),
            },
          },
          null,
          2
        )
      );
    } catch {
      // l'écriture disque ne doit jamais faire planter une requête
    }
  }

  private rollDay(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.day) {
      this.day = today;
      this.used.clear();
      this.failures.clear();
    }
  }

  async isCircuitOpen(name: string): Promise<boolean> {
    const until = this.circuit.get(name) ?? 0;
    if (until <= Date.now()) {
      this.circuit.delete(name);
      return false;
    }
    return true;
  }

  async openCircuit(name: string, minutes: number): Promise<void> {
    this.circuit.set(name, Date.now() + minutes * 60_000);
    this.scheduleSave();
  }

  async usedToday(name: string): Promise<number> {
    this.rollDay();
    return this.used.get(name) ?? 0;
  }

  async consume(name: string): Promise<number> {
    this.rollDay();
    const next = (this.used.get(name) ?? 0) + 1;
    this.used.set(name, next);
    this.scheduleSave();
    return next;
  }

  async recordFailure(name: string): Promise<number> {
    const next = (this.failures.get(name) ?? 0) + 1;
    this.failures.set(name, next);
    this.scheduleSave();
    return next;
  }

  async resetFailures(name: string): Promise<void> {
    this.failures.delete(name);
    this.scheduleSave();
  }
}

// ── Driver Redis (Upstash) ─────────────────────────────────────────────

const REDIS = "rounds:quota";

function usedKey(name: string): string {
  return `${REDIS}:${name}`;
}
function circuitKey(name: string): string {
  return `${REDIS}:${name}:circuit`;
}
function failureKey(name: string): string {
  return `${REDIS}:${name}:fail`;
}

/** Secondes restantes avant minuit (TTL des compteurs quotidiens). */
function secondsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(60, Math.ceil((midnight.getTime() - now.getTime()) / 1000));
}

export class RedisDriver implements QuotaDriver {
  constructor(private redis: Redis) {}

  async isCircuitOpen(name: string): Promise<boolean> {
    const until = await this.redis.get<number>(circuitKey(name));
    return Boolean(until && until > Date.now());
  }

  async openCircuit(name: string, minutes: number): Promise<void> {
    await this.redis.set(circuitKey(name), Date.now() + minutes * 60_000, {
      ex: minutes * 60,
    });
  }

  async usedToday(name: string): Promise<number> {
    return (await this.redis.get<number>(usedKey(name))) ?? 0;
  }

  async consume(name: string): Promise<number> {
    const next = await this.redis.incr(usedKey(name));
    await this.redis.expire(usedKey(name), secondsUntilMidnight());
    return next;
  }

  async recordFailure(name: string): Promise<number> {
    const next = await this.redis.incr(failureKey(name));
    await this.redis.expire(failureKey(name), secondsUntilMidnight());
    return next;
  }

  async resetFailures(name: string): Promise<void> {
    await this.redis.del(failureKey(name));
  }
}

// ── Tracker (API publique) ─────────────────────────────────────────────

function redisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

export class QuotaTracker {
  private driver: QuotaDriver;
  /** providers déjà avertis à 80 % aujourd'hui (évite le spam de logs) */
  private warned = new Set<string>();

  constructor(driver: QuotaDriver) {
    this.driver = driver;
  }

  /** Alerte console quand un provider franchit 80 % de son quota du jour. */
  private maybeWarn(name: string, used: number, limit: number): void {
    if (limit <= 0) return;
    const day = new Date().toISOString().slice(0, 10);
    const key = `${name}:${day}`;
    if (this.warned.has(key)) return;
    if (used >= limit * 0.8) {
      this.warned.add(key);
      console.warn(
        `[quota] ${name} à ${used}/${limit} (${Math.round((used / limit) * 100)} %) — bientôt épuisé, bascule automatique prévue.`
      );
    }
  }

  async isAvailable(name: string, limit: number): Promise<boolean> {
    if (await this.driver.isCircuitOpen(name)) return false;
    return (await this.driver.usedToday(name)) < limit;
  }

  /** Consomme une requête. Retourne false si le quota était déjà épuisé. */
  async consume(name: string, limit: number): Promise<boolean> {
    const used = await this.driver.usedToday(name);
    if (used >= limit) return false;
    const next = await this.driver.consume(name);
    this.maybeWarn(name, next, limit);
    return true;
  }

  async recordFailure(name: string, rateLimited: boolean): Promise<void> {
    const failures = await this.driver.recordFailure(name);
    if (rateLimited || failures >= 3) {
      // circuit ouvert 10 minutes
      await this.driver.openCircuit(name, 10);
    }
  }

  async recordSuccess(name: string): Promise<void> {
    await this.driver.resetFailures(name);
  }

  async usage(name: string, limit: number): Promise<{ used: number; limit: number }> {
    return { used: await this.driver.usedToday(name), limit };
  }
}

function createDriver(): QuotaDriver {
  if (redisConfigured()) {
    return new RedisDriver(
      new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })
    );
  }
  return new MemoryDriver();
}

export const quota = new QuotaTracker(createDriver());
