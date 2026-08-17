import { promises as fs } from "fs";
import path from "path";
import type { Fight, WeightClass } from "../types";
import type { DataProvider } from "./provider";

/**
 * Provider des shards officiels générés par boxingdatasource-pipeline.
 *
 * Le pipeline écrit `public/data/fights/{org}.json` (schéma pipeline :
 * fighter_a/fighter_b/winner/method/rounds/is_title_fight/weight_class)
 * + `public/data/organizations-index.json`. Ce provider les lit en statique
 * (zéro requête runtime vers les organisations) et les mappe vers le type
 * `Fight` du front (fighters[2], outcome, weightClass, source).
 *
 * - Seuls les combats TERMINÉS sont servis (`getRecentFights`) ; les combats
 *   à venir restent au mock/odds (le pipeline ne publie pas de programmation).
 * - Dédup inter-sources par id SHA-256 (le même combat vu par NSAC et WBC
 *   a le même id) — réalisée dans `getRecentFights`.
 * - Absence de shards (pipeline pas encore runné) → [] propre, le routeur
 *   bascule sur les autres sources.
 *
 * ⚠️ Lecture par `fs` : la cible de déploiement doit être un Node long-running
 * (VM/container) — sur Vercel/serverless, `public/` n'est pas lisible par
 * `fs` (voir AUDIT §2). Le cache TTL du routeur limite la lecture à 1×/24 h.
 */

export interface PipelineFight {
  id: string;
  date: string;
  location: string;
  weight_class: string;
  fighter_a: string;
  fighter_b: string;
  winner: string;
  method: string;
  rounds: number;
  is_title_fight: boolean;
}

/** Combat PROGRAMMÉ (schéma pipeline fights-upcoming/, cf. ScheduledFight). */
export interface PipelineScheduledFight {
  id: string;
  date: string;
  location: string;
  weight_class: string;
  fighter_a: string;
  fighter_b: string;
  is_title_fight: boolean;
  amateur?: boolean;
  bout_type?: string;
  promoter?: string;
  org?: string;
}

/** Rapport de vérification du module llm/verify (fights-upcoming-verification.json). */
interface VerificationReport {
  items?: Array<{ id: string; status: string }>;
}

interface OrgIndex {
  organizations: Record<string, { name?: string; abbr?: string; total_fights?: number }>;
}

/** Mapping catégorie pipeline (FR ou EN) → liste canonique FR du front.
 *  Ordre IMPORTANT : les plus spécifiques d'abord (« light heavy » avant
 *  « heavy », « super middle » avant « middle », « junior lightweight »
 *  avant « light »).
 */
const WEIGHT_MAP: Array<[RegExp, WeightClass]> = [
  [/mi-lourds|light heavy/, "Poids mi-lourds"],
  [/lourds-légers|lourds legers|cruiser/, "Poids lourds-légers"],
  [/poids lourds|heavy/, "Poids lourds"],
  [/super-moyens|super middle/, "Poids super-moyens"],
  [/poids moyens|middle/, "Poids moyens"],
  [/super-welters|super welter|light middle|junior middle|jr\.? middle|mi-moyens/, "Poids super-welters"],
  [/welters|welter/, "Poids welters"],
  [/super-légers|super legers|super light|light welter|junior lightweight|junior welter/, "Poids super-légers"],
  [/poids légers|poids legers|^light|light$/, "Poids légers"],
  [/super-plumes|super feather|junior feather/, "Poids super-plumes"],
  [/plumes|feather/, "Poids plumes"],
  [/super-coqs|super bantam/, "Poids super-coqs"],
  [/poids coqs|bantam/, "Poids coqs"],
  [/super-mouches|super fly/, "Poids super-mouches"],
  [/mouches|fly/, "Poids mouches"],
  [/mi-mouches|minimum|straw/, "Poids mi-mouches"],
];

export function mapWeightClass(raw: string): WeightClass | undefined {
  const s = (raw ?? "").toLowerCase();
  if (!s) return undefined;
  // déjà une catégorie canonique FR ? (évite le double mapping)
  const canonical = [
    "Poids lourds", "Poids lourds-légers", "Poids mi-lourds",
    "Poids super-moyens", "Poids moyens", "Poids super-welters",
    "Poids welters", "Poids super-légers", "Poids légers",
    "Poids super-plumes", "Poids plumes", "Poids super-coqs",
    "Poids coqs", "Poids super-mouches", "Poids mouches", "Poids mi-mouches",
  ] as const;
  for (const wc of canonical) {
    if (s === wc.toLowerCase()) return wc;
  }
  for (const [re, wc] of WEIGHT_MAP) {
    if (re.test(s)) return wc;
  }
  return undefined;
}

/** Une catégorie qui EST une ceinture (WBA/WBC/IBF/WBO/…) → titre du combat. */
function isBelt(raw: string): boolean {
  return /(^|\s)(wba|wbc|ibf|wbo|wba\s+international|continental|intercontinental|wbo\s+global|the\s+ring)\b/i.test(raw);
}

/** Mappe un combat programmé du pipeline vers le type Fight du front. */
export function toScheduledFight(
  p: PipelineScheduledFight,
  source: string
): Fight {
  return {
    id: p.id,
    date: p.date,
    status: "upcoming",
    weightClass: mapWeightClass(p.weight_class),
    title: p.is_title_fight
      ? p.bout_type
        ? `${p.bout_type} — ${p.weight_class.trim()}`
        : p.weight_class.trim()
      : undefined,
    location: p.location || undefined,
    fighters: [{ name: p.fighter_a.trim() }, { name: p.fighter_b.trim() }],
    amateur: p.amateur ?? false,
    boutType: p.bout_type || undefined,
    promoter: p.promoter || undefined,
    source,
  };
}

export function toFrontFight(p: PipelineFight, source: string): Fight {
  const a = p.fighter_a.trim();
  const b = p.fighter_b.trim();
  const winner = p.winner?.trim();

  let winnerIndex: 0 | 1 | undefined;
  if (winner === a) winnerIndex = 0;
  else if (winner === b) winnerIndex = 1;
  // Draw / NC → winnerIndex absent (= nul)

  const weightClass = mapWeightClass(p.weight_class);
  const belt = isBelt(p.weight_class);

  return {
    id: p.id, // id SHA-256 déterministe du pipeline → dédup inter-sources
    date: p.date,
    status: "finished",
    weightClass,
    // titre : la ceinture brute si identifiable, sinon « Combat de titre »
    title:
      p.is_title_fight && belt
        ? p.weight_class.trim()
        : p.is_title_fight
          ? "Combat de titre"
          : undefined,
    location: p.location || undefined,
    fighters: [
      { name: a },
      { name: b },
    ],
    outcome: {
      winnerIndex,
      method: winner === "NC" ? "NC" : p.method,
      round: p.rounds > 0 ? p.rounds : undefined,
    },
    source,
  };
}

export class ShardsFightsProvider implements DataProvider {
  readonly name = "shards";
  readonly priority = 3; // après BigBalls/Odds (1) et TheSportsDB/Wikipedia (2), avant le mock (99)
  readonly capabilities = ["fights"] as const;
  readonly dailyLimit = 0; // lecture locale, aucun quota

  isActive(): boolean {
    // Toujours actif : si les shards n'existent pas, getRecentFights → [].
    return true;
  }

  private dataDir(): string {
    return path.join(process.cwd(), "public", "data");
  }

  // Implémentations « vides » : les shards ne servent que les combats
  // terminés (les signatures suivent l'interface DataProvider).
  async listFighters(): Promise<never[]> {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async searchFighters(_query: string, _limit?: number): Promise<never[]> {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getFighter(_slug: string): Promise<null> {
    return null;
  }

  async getUpcomingFights(): Promise<never[]> {
    return []; // programmation = shards fights-upcoming/, pas ici
  }

  /**
   * Combats PROGRAMMÉS (à venir) par organisation — shards
   * `fights-upcoming/{org}.json` générés par `python main.py programmation`
   * (pipeline) puis vérifiés par le module llm/verify.
   *
   * - Tri par date CROISSANTE (le plus proche d'abord) ;
   * - zéro mock : uniquement les calendriers officiels ;
   * - si le rapport de vérification existe, seuls les combats `confirmed`
   *   sont servis (les `flagged` sont « refusés à la publication »).
   */
  async getUpcomingProgrammation(): Promise<Fight[]> {
    const dir = this.dataDir();
    const schedDir = path.join(dir, "fights-upcoming");
    let files: string[] = [];
    try {
      files = await fs.readdir(schedDir);
    } catch {
      return []; // pipeline programmation pas encore runné
    }

    // combats refusés par la vérification (si rapport présent)
    const flagged = new Set<string>();
    try {
      const report = JSON.parse(
        await fs.readFile(path.join(dir, "fights-upcoming-verification.json"), "utf-8")
      ) as VerificationReport;
      for (const item of report.items ?? []) {
        if (item.status === "flagged") flagged.add(item.id);
      }
    } catch {
      // pas de rapport → tout est servi tel quel
    }

    const fights: Fight[] = [];
    const seen = new Set<string>(); // dédup inter-sources par id
    for (const file of files.sort()) {
      if (!file.endsWith(".json") || file === "fights-upcoming-index.json") continue;
      let raw: PipelineScheduledFight[];
      try {
        raw = JSON.parse(
          await fs.readFile(path.join(schedDir, file), "utf-8")
        ) as PipelineScheduledFight[];
      } catch {
        continue;
      }
      const orgSlug = file.replace(/\.json$/, "");
      for (const p of raw) {
        if (!p?.id || !p.fighter_a || !p.fighter_b) continue;
        if (flagged.has(p.id)) continue; // refusé par la vérification IA
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        fights.push(toScheduledFight(p, orgSlug));
      }
    }

    return fights.sort((x, y) => x.date.localeCompare(y.date));
  }

  async getRecentFights(limit = 20): Promise<Fight[]> {
    const dir = this.dataDir();
    const indexPath = path.join(dir, "organizations-index.json");
    let index: OrgIndex;
    try {
      index = JSON.parse(await fs.readFile(indexPath, "utf-8")) as OrgIndex;
    } catch {
      return []; // pipeline pas encore runné → le routeur bascule
    }

    const orgs = index.organizations ?? {};
    const fights: Fight[] = [];
    const seen = new Set<string>(); // dédup inter-sources par id SHA-256

    for (const slug of Object.keys(orgs).sort()) {
      const shardPath = path.join(dir, "fights", `${slug}.json`);
      let raw: PipelineFight[];
      try {
        raw = JSON.parse(await fs.readFile(shardPath, "utf-8")) as PipelineFight[];
      } catch {
        continue; // shard manquant/corrompu → on passe à la source suivante
      }
      for (const p of raw) {
        if (!p?.id || !p.fighter_a || !p.fighter_b) continue;
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        fights.push(toFrontFight(p, slug));
      }
    }

    // plus récents d'abord (les shards sont déjà triés, on re-trie par sécurité)
    return fights
      .sort((x, y) => y.date.localeCompare(x.date))
      .slice(0, limit);
  }
}
