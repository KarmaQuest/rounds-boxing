import "server-only";
import { cache, TTL } from "../cache";
import { quota } from "../quota";
import type { Capability, DataProvider } from "./provider";
import type { Fighter, Fight, Stance } from "../types";
import { dedupeFighters, fightImportance, slugify } from "../utils";

export class RateLimitedError extends Error {
  constructor(provider: string) {
    super(`Rate limit atteint sur ${provider}`);
    this.name = "RateLimitedError";
  }
}

function isRateLimit(res: Response): boolean {
  return res.status === 429 || res.status === 401 || res.status === 403;
}

function hasFights(record: Fighter["record"]): boolean {
  return record.wins + record.losses + record.draws > 0;
}

/**
 * Fiabilité des sources pour les données PHYSIQUES (taille, allonge, garde).
 * - Wikipedia (infobox curée) > Big Balls (API réelle, champs parfois null)
 *   > mock (fiches démo) > TheSportsDB (défauts systématiques).
 * Sert à départager deux valeurs « réelles » qui se contredisent.
 */
const PHYS_TRUST: Record<string, number> = {
  wikipedia: 3,
  bigballs: 2,
  mock: 1,
  thesportsdb: 0,
};

function physTrust(f: Fighter): number {
  return PHYS_TRUST[f.source ?? ""] ?? 0;
}

/** Une valeur numérique physique est « réelle » si elle est non nulle. */
function physReal(v: number): boolean {
  return typeof v === "number" && v > 0;
}

/** Choisit la meilleure valeur physique entre deux sources (défaut → 0). */
function pickPhys(existing: number, incoming: number, eTrust: number, iTrust: number): number {
  const eReal = physReal(existing);
  const iReal = physReal(incoming);
  if (eReal && !iReal) return existing;
  if (iReal && !eReal) return incoming;
  if (eReal && iReal) return iTrust > eTrust ? incoming : existing;
  return existing;
}

/**
 * Garde : une garde SPÉCIFIQUE (Southpaw/Switch) prime sur « Orthodoxe »,
 * car « Orthodoxe » est aussi la valeur par défaut quand une source ne sait
 * pas. À spécificité égale, la source la plus fiable gagne.
 */
function pickStance(existing: Fighter, incoming: Fighter): Stance {
  const e = existing.stance;
  const i = incoming.stance;
  const specific = (s: Stance) => s === "Southpaw" || s === "Switch";
  if (specific(i) && !specific(e)) return i;
  if (specific(e) && !specific(i)) return e;
  return physTrust(incoming) > physTrust(existing) ? i : e;
}

/**
 * Fusionne deux fiches du même boxeur (slug identique) :
 * - `incoming` (source arrivée en second, typiquement le mock) remplit ce
 *   que la source réelle n'a pas (palmarès, ceintures, bio, rang) ;
 * - on préserve les données réelles utiles absentes du mock (ID BoxRec) ;
 * - `recordPriority` règle qui gagne sur le palmarès quand les deux sources
 *   en fournissent un :
 *   - `"first"` (recommandé) : la source arrivée en premier (priorité haute,
 *     ex. Big Balls) garde son palmarès s'il contient des combats — utile le
 *     jour où les APIs réelles publieront de vrais records ;
 *   - `"last"` (défaut historique) : la source arrivée en dernier (le mock)
 *     écrase. Big Balls renvoyant record: null (→ 0-0-0), le mock enrichit.
 */
function mergeFighter(
  existing: Fighter,
  incoming: Fighter,
  recordPriority: "first" | "last" = "last"
): Fighter {
  const record =
    recordPriority === "first"
      ? hasFights(existing.record)
        ? existing.record
        : hasFights(incoming.record)
          ? incoming.record
          : existing.record
      : hasFights(incoming.record)
        ? incoming.record
        : existing.record;

  const eTrust = physTrust(existing);
  const iTrust = physTrust(incoming);

  return {
    // La source suivante (Wikipedia minimal, mock) comble les trous…
    ...incoming,
    // …mais la source arrivée en premier (priorité haute : Big Balls,
    // Wikipedia) GARDE ses champs — jamais d'écrasement d'un champ réel
    // par `undefined` (ex. une fiche Wikipedia minimale sans bio ni pays)
    ...existing,
    boxrecId: incoming.boxrecId ?? existing.boxrecId,
    record,
    // le label source suit le palmarès retenu (pas le dernier provider)
    source: record === existing.record ? existing.source : incoming.source,
    titles: incoming.titles.length > 0 ? incoming.titles : existing.titles,
    bio: incoming.bio ?? existing.bio,
    // le rank (p4p du mock, ou futur rang réel) ne doit jamais être écrasé
    // par un `undefined` d'une source qui n'en fournit pas
    rank: incoming.rank ?? existing.rank,
    promoter: incoming.promoter ?? existing.promoter,
    // ── Données physiques : les défauts (0, « Orthodoxe ») d'une API ne
    // doivent jamais écraser une valeur réelle d'une source plus fiable
    // (ex. le snapshot Wikipedia d'Usyk : Southpaw, allonge 198 — alors que
    // Big Balls / TheSportsDB renvoient Orthodoxe / 0).
    heightCm: pickPhys(existing.heightCm, incoming.heightCm, eTrust, iTrust),
    reachCm: pickPhys(existing.reachCm, incoming.reachCm, eTrust, iTrust),
    stance: pickStance(existing, incoming),
  };
}

/** Clé de déduplication d'un combat : paire de noms triée. */
function fightKey(fight: Fight): string {
  const names = fight.fighters.map((f) => slugify(f.name)).sort();
  return names.join("|");
}

/**
 * Le routeur est l'épine dorsale de la stratégie multi-API :
 * 1. il interroge TOUTES les sources capables (pas juste la première),
 *    dans l'ordre de priorité, et fusionne leurs résultats ;
 * 2. il saute celles dont le quota quotidien est épuisé ou dont le circuit
 *    est ouvert (erreurs répétées) ;
 * 3. en cas de 429/erreur, il ouvre le circuit et continue ;
 * 4. chaque réponse passe par un cache TTL → très peu de requêtes réelles ;
 * 5. le mock (priorité la plus basse) enrichit les stars avec palmarès,
 *    ceintures et bios que les APIs réelles ne fournissent pas encore.
 */
class ProviderRouter {
  private providers: DataProvider[];

  constructor(providers: DataProvider[]) {
    this.providers = [...providers]
      .filter((p) => p.isActive())
      .sort((a, b) => a.priority - b.priority);
  }

  private capable(p: DataProvider, cap: Capability): boolean {
    return p.capabilities.includes(cap);
  }

  /** Récupère (cache + quota) la réponse d'UN provider, null si indisponible. */
  private async fetchOne<T>(
    provider: DataProvider,
    capability: Capability,
    cacheKey: string,
    ttlMs: number,
    fn: (p: DataProvider) => Promise<T>
  ): Promise<T | null> {
    if (!this.capable(provider, capability)) return null;

    const cached = await cache.get<T>(`${provider.name}:${cacheKey}`);
    if (cached !== undefined) return cached;

    const limited = provider.dailyLimit > 0;
    if (limited && !(await quota.isAvailable(provider.name, provider.dailyLimit))) return null;
    if (limited && !(await quota.consume(provider.name, provider.dailyLimit))) return null;

    try {
      const value = await fn(provider);
      if (limited) await quota.recordSuccess(provider.name);
      await cache.set(`${provider.name}:${cacheKey}`, value, ttlMs);
      return value;
    } catch (err) {
      const rateLimited =
        err instanceof RateLimitedError ||
        (err instanceof Error && err.message.includes("429"));
      if (limited) await quota.recordFailure(provider.name, rateLimited);
      return null;
    }
  }

  /**
   * Collecte les boxeurs de TOUTES les sources capables et les fusionne
   * (dédup par slug, mock en dernier → il enrichit les stars).
   */
  async listFighters(limit = 200): Promise<{ fighters: Fighter[]; source: string }> {
    const merged = new Map<string, Fighter>();
    const sources: string[] = [];

    for (const provider of this.providers) {
      const list = await this.fetchOne<Fighter[]>(
        provider,
        "fighters",
        `list:${limit}`,
        TTL.search,
        (p) => p.listFighters(limit)
      );
      if (!list || list.length === 0) continue;
      sources.push(provider.name);
      for (const fighter of list) {
        const existing = merged.get(fighter.slug);
        // recordPriority "first" : le palmarès d'une source réelle (arrivée
        // en premier) prime sur celui du mock dès qu'il contient des combats.
        merged.set(
          fighter.slug,
          existing ? mergeFighter(existing, fighter, "first") : fighter
        );
      }
    }

    // ⚠️ Pas de slice ici : la limite sert à cadrer les FETCH des providers,
    // pas la fusion. Couper à `limit` laisserait les ajouts Wikipedia (stars
    // absentes du pool Big Balls) hors du pool — la pagination/tri se font
    // dans applyFilters (index.ts).
    return {
      fighters: dedupeFighters([...merged.values()]),
      source: sources.length > 0 ? sources.join(" + ") : "aucune",
    };
  }

  async searchFighters(
    query: string,
    limit = 50
  ): Promise<{ fighters: Fighter[]; source: string }> {
    const merged = new Map<string, Fighter>();
    const sources: string[] = [];
    const cacheKey = `search:${query.toLowerCase().trim()}:${limit}`;

    for (const provider of this.providers) {
      const list = await this.fetchOne<Fighter[]>(
        provider,
        "fighters",
        cacheKey,
        TTL.search,
        (p) => p.searchFighters(query, limit)
      );
      if (!list || list.length === 0) continue;
      sources.push(provider.name);
      for (const fighter of list) {
        const existing = merged.get(fighter.slug);
        merged.set(
          fighter.slug,
          existing ? mergeFighter(existing, fighter, "first") : fighter
        );
      }
    }

    return {
      fighters: dedupeFighters([...merged.values()]).slice(0, limit),
      source: sources.length > 0 ? sources.join(" + ") : "aucune",
    };
  }

  async getFighter(slug: string): Promise<{ fighter: Fighter | null; source: string }> {
    let merged: Fighter | null = null;
    const sources: string[] = [];

    for (const provider of this.providers) {
      const fighter = await this.fetchOne<Fighter | null>(
        provider,
        "fighters",
        `one:${slug}`,
        TTL.fighter,
        (p) => p.getFighter(slug)
      );
      if (!fighter) continue;
      sources.push(provider.name);
      merged = merged ? mergeFighter(merged, fighter, "first") : fighter;
    }

    return { fighter: merged, source: sources.join(" + ") || "aucune" };
  }

  async upcomingFights(limit = 20): Promise<{ fights: Fight[]; source: string }> {
    const merged = new Map<string, Fight>();
    const realKeys = new Set<string>(); // paires venues d'une source RÉELLE
    const sources: string[] = [];

    for (const provider of this.providers) {
      const list = await this.fetchOne<Fight[]>(
        provider,
        "odds",
        `upcoming:${limit}`,
        TTL.upcomingFights,
        (p) => p.getUpcomingFights(limit)
      );
      if (!list || list.length === 0) continue;
      sources.push(provider.name);
      for (const fight of list) {
        const key = fightKey(fight);
        if (provider.name !== "mock") realKeys.add(key);
        const existing = merged.get(key);
        if (!existing) {
          merged.set(key, fight);
        } else if (existing.odds) {
          // les cotes et la date réelles (oddsapi, première source) priment ;
          // la fiche enrichie (venue, titre, catégorie) vient du mock
          merged.set(key, {
            ...fight,
            date: existing.date,
            odds: existing.odds,
            source: fight.source,
          });
        } else {
          // deux sources sans cotes (ex. mock seul) : la fiche la plus
          // complète (venue, titre) complète sans toucher à la date
          merged.set(key, {
            ...existing,
            ...fight,
            odds: fight.odds ?? existing.odds,
          });
        }
      }
    }

    // Les combats à venir doivent être À JOUR : quand une source réelle
    // (Odds API) répond, on écarte les affiches FICTIVES du mock (dates
    // figées, cotes inventées) qui n'ont aucun équivalent réel. Le mock ne
    // sert plus que d'ENRICHISSEMENT des vrais combats (titre, venue) et de
    // filet de sécurité si aucune source réelle ne répond.
    const hasReal = sources.some((s) => s !== "mock");
    const now = Date.now();
    const fights = [...merged.values()]
      .filter((f) => !hasReal || f.source !== "mock" || realKeys.has(fightKey(f)))
      .filter((f) => new Date(f.date).getTime() > now)
      // Tri demandé : du combat le plus PROCHE au plus lointain (date
      // croissante d'abord), l'importance ne départage que les égalités.
      .sort(
        (a, b) =>
          new Date(a.date).getTime() - new Date(b.date).getTime() ||
          fightImportance(b) - fightImportance(a)
      )
      .slice(0, limit);

    // Le label source reflète ce qui est RÉELLEMENT servi : quand une source
    // réelle répond, les fiches mock servies ne sont que des enrichissements
    // → on n'affiche que les sources réelles (pas « + mock »).
    const served = hasReal
      ? sources.filter((s) => s !== "mock")
      : sources;
    return {
      fights,
      source: served.length > 0 ? served.join(" + ") : "aucune",
    };
  }

  async recentFights(limit = 20): Promise<{ fights: Fight[]; source: string }> {
    const merged = new Map<string, Fight>();
    const sources: string[] = [];

    for (const provider of this.providers) {
      const list = await this.fetchOne<Fight[]>(
        provider,
        "fights",
        `recent:${limit}`,
        TTL.recentFights,
        (p) => p.getRecentFights(limit)
      );
      if (!list || list.length === 0) continue;
      sources.push(provider.name);
      for (const fight of list) {
        merged.set(fightKey(fight), fight);
      }
    }

    return {
      // les plus RÉCENTS d'abord (les scores Odds API peuvent être plus
      // frais que les shards du pipeline)
      fights: [...merged.values()]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, limit),
      source: sources.join(" + ") || "aucune",
    };
  }

  /** Providers actifs et leur usage courant (pour affichage debug). */
  async status(): Promise<Array<{ name: string; priority: number; usage: string }>> {
    const statuses = await Promise.all(
      this.providers.map(async (p) => {
        const { used } = await quota.usage(p.name, p.dailyLimit);
        return { name: p.name, priority: p.priority, usage: `${used}/${p.dailyLimit}` };
      })
    );
    return statuses;
  }
}

export { ProviderRouter };

/** Réutilise la même instance fetch pour dédupliquer les appels dans Next. */
export const fetchJson = async <T>(
  url: string,
  init?: RequestInit
): Promise<T> => {
  const res = await fetch(url, init);
  if (isRateLimit(res)) {
    throw new RateLimitedError(url.split("/")[2] ?? "provider");
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} — ${url}`);
  }
  return (await res.json()) as T;
};
