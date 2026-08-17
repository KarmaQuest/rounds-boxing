import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type { BoxerRecord, Fighter, Stance } from "../types";
import { flagForCountry } from "../utils";
import { mapWeightClass } from "./shardsfights";
import type { DataProvider } from "./provider";

/**
 * Provider « annuaire » — lecture statique de `public/data/boxers/merged.json`
 * (22 186 boxeurs, généré par `python main.py boxers` du pipeline).
 *
 * Les providers live (Big Balls, Wikipedia, mock) ne couvrent qu'une partie
 * des boxeurs (pool alphabétique + stars) : un boxeur comme Bakary Samake,
 * présent dans l'annuaire avec son record, n'était pas trouvable. Ce provider
 * est le DERNIER recours (priorité après le mock) :
 * - il ne régresse jamais un record complet (mock/Wikipedia) — la fusion du
 *   routeur garde le premier record non vide (« first ») ;
 * - il complète : fiches minimales, records dérivés des combats collectés
 *   (FFBoxe/IBF/WBC…), et résout la page boxeur de n'importe quel slug.
 *
 * ⚠️ Lecture par `fs` : même contrainte que ShardsFightsProvider/CareersProvider
 * (cible Node long-running, voir AUDIT §2). Parse en cache mémoire par process.
 */

interface MergedBoxer {
  id: string;
  name: string;
  slug: string;
  aliases?: string[];
  country?: string;
  weight_class?: string;
  birth_date?: string;
  height_cm?: number;
  reach_cm?: number;
  stance?: string;
  record?: [number, number, number, number]; // [V, D, N, KO]
  sources?: string[];
  wikidata_id?: string;
  orgs?: string[];
  title_fights?: number;
}

/** Cache process : merged.json est gros (~9 Mo), on ne le parse qu'une fois. */
let cache: Map<string, MergedBoxer> | null = null;

/** Vide le cache (tests : chaque scénario écrit son propre merged.json). */
export function resetAnnuaireCache(): void {
  cache = null;
}

/** Annuaire par slug (pour l'enrichissement : drapeau/pays d'un adversaire). */
export async function annuaireBySlug(): Promise<
  Map<string, { name: string; country?: string }>
> {
  const all = await loadAll();
  const out = new Map<string, { name: string; country?: string }>();
  for (const b of all.values()) out.set(b.slug, { name: b.name, country: b.country });
  return out;
}

async function loadAll(): Promise<Map<string, MergedBoxer>> {
  if (cache) return cache;
  let raw: MergedBoxer[];
  try {
    const file = path.join(process.cwd(), "public", "data", "boxers", "merged.json");
    raw = JSON.parse(await fs.readFile(file, "utf-8")) as MergedBoxer[];
  } catch {
    cache = new Map(); // merged.json absent → annuaire vide, le routeur bascule
    return cache;
  }
  cache = new Map();
  for (const b of raw) {
    if (b?.slug && b?.name) cache.set(b.slug, b);
  }
  return cache;
}

function mapStance(raw?: string): Stance {
  const s = (raw ?? "").toLowerCase();
  if (/southpaw|gaucher|fausse patte/.test(s)) return "Southpaw";
  if (/switch|ambidextre/.test(s)) return "Switch";
  return "Orthodoxe";
}

function toFighter(b: MergedBoxer): Fighter {
  const birthYear = b.birth_date ? Number(b.birth_date.slice(0, 4)) : 0;
  const rec = b.record ?? [0, 0, 0, 0];
  const record: BoxerRecord = {
    wins: rec[0] ?? 0,
    losses: rec[1] ?? 0,
    draws: rec[2] ?? 0,
    ko: rec[3] ?? 0,
  };
  return {
    id: b.id,
    slug: b.slug,
    name: b.name,
    country: b.country || "Inconnu",
    flag: flagForCountry(b.country),
    weightClass: mapWeightClass(b.weight_class ?? "") ?? "Poids lourds",
    stance: mapStance(b.stance),
    heightCm: b.height_cm ?? 0,
    reachCm: b.reach_cm ?? 0,
    age: birthYear ? Math.max(18, new Date().getFullYear() - birthYear) : 28,
    debutYear: birthYear ? birthYear + 21 : 2015,
    record,
    titles: [],
    source: "annuaire",
  };
}

/** Recherche insensible aux accents sur nom + alias. */
function matches(b: MergedBoxer, needle: string): boolean {
  const haystack = [b.name, ...(b.aliases ?? [])]
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return haystack.includes(needle);
}

export class MergedBoxersProvider implements DataProvider {
  readonly name = "annuaire";
  readonly priority = 100; // dernier recours (après le mock) : ne régresse rien
  readonly capabilities = ["fighters"] as const;
  readonly dailyLimit = 0; // lecture locale, aucun quota

  isActive(): boolean {
    return true; // merged.json absent → listes vides, le routeur bascule
  }

  async listFighters(limit = 200): Promise<Fighter[]> {
    const all = await loadAll();
    const out: Fighter[] = [];
    for (const b of all.values()) {
      out.push(toFighter(b));
      if (out.length >= limit) break;
    }
    return out;
  }

  async searchFighters(query: string, limit = 50): Promise<Fighter[]> {
    const needle = query
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (!needle) return [];
    const all = await loadAll();
    const out: Fighter[] = [];
    for (const b of all.values()) {
      if (!matches(b, needle)) continue;
      out.push(toFighter(b));
      if (out.length >= limit) break;
    }
    return out;
  }

  async getFighter(slug: string): Promise<Fighter | null> {
    const all = await loadAll();
    const b = all.get(slug);
    return b ? toFighter(b) : null;
  }

  async getUpcomingFights(): Promise<never[]> {
    return [];
  }

  async getRecentFights(): Promise<never[]> {
    return [];
  }
}
