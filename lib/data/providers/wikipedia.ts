import type { Fighter } from "../types";
import { parseBoxerInfobox } from "./wikipedia-parse";
import { FIGHTERS } from "./mock";
import type { DataProvider } from "./provider";
import type { WikipediaRecord } from "./wikipedia-types";
import WIKIPEDIA_RECORDS from "./wikipedia-records.json";

/**
 * Provider Wikipedia — palmarès réels des boxeurs.
 *
 * Les articles des boxeurs contiennent une infobox (`{{Infobox Boxeur}}`
 * en français, `{{Infobox boxer}}` en anglais) avec le palmarès complet
 * (victoires / défaites / nuls / KO), la taille, l'allonge, la garde et
 * la catégorie — gratuit, licence CC BY-SA.
 *
 * Fonctionnement :
 * - Un SNAPSHOT committé (`wikipedia-records.json`) fournit les palmarès
 *   du pool visible (≈1500 boxeurs Big Balls + les stars du mock), généré
 *   par `scripts/refresh-wikipedia.ts`. Zéro requête réseau en runtime →
 *   répertoire instantané, aucune dépendance, aucun risque de rate-limit.
 * - Rafraîchissement : relancer le script (une commande, ~1-2 min) puis
 *   committer le JSON — c'est un dataset, comme les autres sources.
 * - Les boxeurs du snapshot absents du mock reçoivent une fiche minimale
 *   (nom + palmarès) ; le routeur fusionne avec la fiche Big Balls (bio,
 *   nationalité, taille…), qui n'est jamais écrasée par des `undefined`.
 */

/** Snapshot typé : dictionnaire slug → fiche. */
const RECORDS = WIKIPEDIA_RECORDS as unknown as Record<string, WikipediaRecord>;

/** Fiche minimale pour un boxeur du snapshot absent du mock : le routeur
 *  complètera avec Big Balls (bio, pays, taille…) via la fusion. */
function minimalBase(slug: string, name: string): Fighter {
  return {
    id: `wiki-${slug}`,
    slug,
    name,
    country: "",
    flag: "",
    weightClass: "Poids lourds",
    stance: "Orthodoxe",
    heightCm: 0,
    reachCm: 0,
    age: 28,
    debutYear: 2015,
    record: { wins: 0, losses: 0, draws: 0, ko: 0 },
    titles: [],
    source: "wikipedia",
  };
}

/** Base par slug : fiche mock quand elle existe, sinon minimale. */
const BASES = new Map<string, Fighter>(
  FIGHTERS.map((f) => [f.slug, f])
);

/** Applique le palmarès Wikipedia par-dessus la fiche de base. */
function enrich(slug: string, parsed: WikipediaRecord): Fighter {
  const base = BASES.get(slug) ?? minimalBase(slug, parsed.name);
  return {
    ...base,
    record: {
      wins: parsed.record.wins ?? base.record.wins,
      losses: parsed.record.losses ?? base.record.losses,
      draws: parsed.record.draws ?? base.record.draws,
      ko: parsed.record.ko ?? base.record.ko,
    },
    heightCm: parsed.heightCm ?? base.heightCm,
    reachCm: parsed.reachCm ?? base.reachCm,
    stance: parsed.stance ?? base.stance,
    weightClass: parsed.weightClass ?? base.weightClass,
    nickname: parsed.nickname ?? base.nickname,
    source: "wikipedia",
  };
}

/** Ordre stable du snapshot (celui du fichier JSON = ordre du pool Big Balls). */
const SLUGS = Object.keys(RECORDS);

export class WikipediaProvider implements DataProvider {
  readonly name = "wikipedia";
  readonly priority = 2; // après Big Balls, avant le mock
  readonly capabilities = ["fighters"] as const;
  readonly dailyLimit = 0; // gratuit

  isActive(): boolean {
    return true;
  }

  async listFighters(limit = 200): Promise<Fighter[]> {
    const out: Fighter[] = [];
    for (const slug of SLUGS) {
      out.push(enrich(slug, RECORDS[slug]!));
      if (out.length >= limit) break;
    }
    return out;
  }

  async searchFighters(query: string, limit = 50): Promise<Fighter[]> {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    const out: Fighter[] = [];
    for (const slug of SLUGS) {
      if (out.length >= limit) break;
      const parsed = RECORDS[slug]!;
      const base = BASES.get(slug);
      const haystack = `${parsed.name} ${base?.nickname ?? ""} ${parsed.nickname ?? ""}`;
      if (!haystack.toLowerCase().includes(q)) continue;
      out.push(enrich(slug, parsed));
    }
    return out;
  }

  async getFighter(slug: string): Promise<Fighter | null> {
    const parsed = RECORDS[slug];
    return parsed ? enrich(slug, parsed) : null;
  }

  async getUpcomingFights(): Promise<never[]> {
    return [];
  }

  async getRecentFights(): Promise<never[]> {
    return [];
  }
}

export { parseBoxerInfobox };
