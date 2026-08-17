import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type { Fight, FightFighterRef } from "../types";
import { flagForCountry, slugify } from "../utils";
import type { PipelineFight } from "./shardsfights";
import { toFrontFight } from "./shardsfights";
import type { WikipediaBout } from "./wikipedia-types";
import { annuaireBySlug } from "./mergedboxers";

/**
 * Dataset carrières Wikipedia — { slug → { name, bouts[] } }, généré par
 * `scripts/add-wikipedia-bouts.ts` (~22 Mo, 3 022 boxeurs). Lecture par `fs`
 * avec cache process : trop lourd pour un import statique (bundle + fraîcheur).
 */
type CareersMap = Record<string, { name: string; bouts?: WikipediaBout[] }>;

let careersCache: CareersMap | null = null;

/** Vide le cache (tests : chaque scénario contrôle son dataset). */
export function resetCareersCache(): void {
  careersCache = null;
}

async function loadCareers(): Promise<CareersMap> {
  if (careersCache) return careersCache;
  try {
    const file = path.join(
      process.cwd(),
      "lib",
      "data",
      "providers",
      "wikipedia-careers.json"
    );
    careersCache = JSON.parse(await fs.readFile(file, "utf-8")) as CareersMap;
  } catch {
    careersCache = {}; // dataset absent → carrière pipeline seule
  }
  return careersCache;
}

/**
 * Provider de carrière par boxeur — brique 3 du plan d'archive.
 *
 * Deux sources complémentaires, fusionnées du combat le plus récent au
 * plus ancien (comme BoxRec) :
 * 1. **Archive pipeline** : `public/data/boxers/careers.json` (généré par
 *    `python main.py careers`) — { slug → { id, name, fights: [PipelineFight
 *    + org, …] } } — les combats collectés par le pipeline (shards IBF/WBC/
 *    WBO/FFBoxe…), toutes années ;
 * 2. **Palmarès Wikipedia** : le tableau « Professional boxing record » des
 *    articles de boxeurs (snapshot `wikipedia-records.json`, champ `bouts`)
 *    — la carrière COMPLÈTE des boxeurs notables (ex. les 25 combats d'Usyk),
 *    là où le pipeline ne collecte qu'une partie des sources.
 *
 * Déduplication croisée par (date + paires de noms normalisés) : le même
 * combat vu par le pipeline ET Wikipedia n'apparaît qu'une fois (la version
 * pipeline, qui porte l'org source, est conservée).
 *
 * ⚠️ Lecture par `fs` : même contrainte que ShardsFightsProvider — cible
 * Node long-running (voir AUDIT §2).
 */

interface CareersEntry {
  id: string;
  name: string;
  fights: PipelineFight[]; // chaque combat porte aussi `org` (slug source)
}

interface CareersFile {
  generated_at?: string;
  boxers: Record<string, CareersEntry>;
}

/** Palmarès complets Wikipedia ({slug → {name, bouts}}), généré par
 *  `scripts/add-wikipedia-bouts.ts` — couvre tous les boxeurs avec un ID
 *  Wikidata (bigballs + merged + careers), pas seulement le snapshot. */

/** Un combat du palmarès Wikipedia → type Fight du front (boxeur en [0]). */
export function boutToFight(slug: string, boxerName: string, b: WikipediaBout): Fight {
  return {
    id: `wiki-${slug}-${b.date}-${slugify(b.opponent)}`,
    date: b.date,
    status: "finished",
    title: b.title,
    location: b.location,
    fighters: [{ name: boxerName }, { name: b.opponent }],
    outcome: {
      winnerIndex:
        b.result === "Win" ? 0 : b.result === "Loss" ? 1 : undefined,
      method: b.type ?? "PTS",
      round: b.round,
    },
    source: "wikipedia",
  };
}

/**
 * Fusion pipeline + Wikipedia, dédup par (date + paires de noms) et tri
 * date décroissante (dernier combat en premier). La version pipeline prime
 * sur Wikipedia pour un même combat (elle porte l'org source).
 */
export function mergeCareers(pipeline: Fight[], wikipedia: Fight[]): Fight[] {
  const seen = new Set<string>();
  const out: Fight[] = [];
  for (const f of [...pipeline, ...wikipedia]) {
    const names = f.fighters.map((x) => slugify(x.name)).sort().join("|");
    const key = `${f.date}|${names}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export class CareersProvider {
  readonly name = "careers";

  /** Dataset carrières Wikipedia injectable (les tests passent un dataset vide). */
  constructor(private careers?: CareersMap) {}

  private dataDir(): string {
    return path.join(process.cwd(), "public", "data");
  }

  /** Tous les combats d'un boxeur (slug) → Fight[] du front, date desc. */
  async getCareer(slug: string): Promise<Fight[]> {
    // 1. archive pipeline (combats collectés par les shards)
    const filePath = path.join(this.dataDir(), "boxers", "careers.json");
    let data: CareersFile;
    try {
      data = JSON.parse(await fs.readFile(filePath, "utf-8")) as CareersFile;
    } catch {
      data = { boxers: {} };
    }
    const entry = data.boxers?.[slug];
    const pipeline: Fight[] = [];
    if (entry && entry.fights.length > 0) {
      const seen = new Set<string>(); // dédup interne par id SHA-256
      for (const p of entry.fights) {
        if (!p?.id || seen.has(p.id)) continue;
        seen.add(p.id);
        pipeline.push(toFrontFight(p, (p as PipelineFight & { org?: string }).org ?? "orgs"));
      }
    }

    // 2. palmarès complet Wikipedia (tableau pro record)
    const wikipedia: Fight[] = [];
    const careers = this.careers ?? (await loadCareers());
    const wr = careers[slug];
    if (wr?.bouts && wr.bouts.length > 0) {
      for (const b of wr.bouts) {
        wikipedia.push(boutToFight(slug, wr.name, b));
      }
    }

    // fusion + dédup croisée + tri (dernier combat en premier)
    const merged = mergeCareers(pipeline, wikipedia);
    return this.enrichFlags(merged);
  }

  /** Drapeaux des adversaires/boxeurs connus de l'annuaire (merged.json). */
  private async enrichFlags(fights: Fight[]): Promise<Fight[]> {
    const annuaire = await annuaireBySlug();
    if (annuaire.size === 0) return fights;
    const withFlag = (ref: FightFighterRef): FightFighterRef => {
      const entry = annuaire.get(slugify(ref.name));
      if (!entry?.country) return ref;
      return { ...ref, flag: flagForCountry(entry.country) };
    };
    return fights.map((f) => ({
      ...f,
      fighters: [withFlag(f.fighters[0]!), withFlag(f.fighters[1]!)] as [
        FightFighterRef,
        FightFighterRef
      ],
    }));
  }
}
