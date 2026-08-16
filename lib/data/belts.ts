import { promises as fs } from "fs";
import path from "path";
import { slugify } from "./utils";
import { BELT_STATUS, type BeltStatus } from "./belt-status";

/**
 * Ceintures remportées par les boxeurs, dérivées des résultats OFFICIELS
 * du pipeline (`public/data/fights/{org}.json`) : chaque combat de titre
 * (`is_title_fight`) dont le vainqueur est identifié = une ceinture gagnée,
 * avec sa date et sa catégorie — groupées par organisation sur le profil.
 *
 * - Lecture statique (zéro réseau), index construit une fois puis mis en
 *   cache en mémoire (les shards sont committés, ~1850 combats).
 * - Le vainqueur est résolu par égalité exacte avec fighter_a/fighter_b
 *   (les nuls/vacants n'attribuent aucune ceinture).
 */

/** Slug d'organisation → libellé affiché. */
const ORG_LABELS: Record<string, string> = {
  ibf: "IBF",
  wba: "WBA",
  wbc: "WBC",
  wbo: "WBO",
  csac: "CSAC",
  nsac: "NSAC",
  ffboxe: "FFBoxe",
};

/** Retire les parenthèses de poids (« Heavyweight (Over 200 LBS) » → « Heavyweight »). */
function cleanBelt(raw: string): string {
  return (raw ?? "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Catégories pures EN → FR (régionales gardent leur nom brut, ex. « WBA Gold »). */
const CATEGORY_MAP: Array<[RegExp, string]> = [
  [/^heavyweight$/i, "Poids lourds"],
  [/^cruiserweight$/i, "Poids lourds-légers"],
  [/^light heavyweight$/i, "Poids mi-lourds"],
  [/^super middleweight$/i, "Poids super-moyens"],
  [/^middleweight$/i, "Poids moyens"],
  [/^super welterweight$|^light middleweight$/i, "Poids super-welters"],
  [/^welterweight$/i, "Poids welters"],
  [/^super lightweight$|^light welterweight$/i, "Poids super-légers"],
  [/^lightweight$/i, "Poids légers"],
  [/^super featherweight$/i, "Poids super-plumes"],
  [/^featherweight$/i, "Poids plumes"],
  [/^super bantamweight$/i, "Poids super-coqs"],
  [/^bantamweight$/i, "Poids coqs"],
  [/^super flyweight$/i, "Poids super-mouches"],
  [/^flyweight$/i, "Poids mouches"],
  [/^minimumweight$|^strawweight$/i, "Poids mi-mouches"],
];

/** Une ceinture remportée (victoire en combat de titre). */
export interface BeltWin {
  org: string;
  label: string;
  belt: string; // catégorie FR ou ceinture régionale brute
  date: string; // ISO
}

let cache: Map<string, BeltWin[]> | null = null;

async function buildIndex(): Promise<Map<string, BeltWin[]>> {
  const dir = path.join(process.cwd(), "public", "data", "fights");
  const index = new Map<string, BeltWin[]>();

  for (const [org, label] of Object.entries(ORG_LABELS)) {
    let fights: Array<{
      fighter_a?: string;
      fighter_b?: string;
      winner?: string;
      weight_class?: string;
      date?: string;
      is_title_fight?: boolean;
    }>;
    try {
      fights = JSON.parse(await fs.readFile(path.join(dir, `${org}.json`), "utf-8"));
    } catch {
      continue; // shard absent/corrompu → on passe
    }

    for (const f of fights) {
      if (!f?.is_title_fight || !f?.winner) continue;
      const a = (f.fighter_a ?? "").trim();
      const b = (f.fighter_b ?? "").trim();
      const w = f.winner.trim();
      if (!a || !b) continue;

      let slug: string | null = null;
      if (w === a) slug = slugify(a);
      else if (w === b) slug = slugify(b);
      if (!slug) continue; // nul / vacant → personne ne gagne la ceinture

      const raw = cleanBelt(f.weight_class ?? "");
      let belt = raw;
      for (const [re, fr] of CATEGORY_MAP) {
        if (re.test(raw)) {
          belt = fr;
          break;
        }
      }

      const wins = index.get(slug) ?? [];
      wins.push({ org, label, belt, date: f.date ?? "" });
      index.set(slug, wins);
    }
  }

  for (const wins of index.values()) {
    wins.sort((x, y) => y.date.localeCompare(x.date));
  }
  return index;
}

/**
 * Ceintures d'un boxeur, groupées par organisation : le STATUT ACTUEL
 * (curé, ex. « Vacant » pour Usyk qui a abandonné ses ceintures en 2026)
 * + l'HISTORIQUE daté des victoires en combat de titre (shards officiels).
 */
export async function getBoxerBelts(
  slug: string
): Promise<
  { org: string; label: string; status?: BeltStatus; wins: BeltWin[] }[]
> {
  if (!cache) cache = await buildIndex();
  const wins = cache.get(slug) ?? [];

  const byOrg = new Map<string, BeltWin[]>();
  for (const w of wins) {
    const list = byOrg.get(w.org) ?? [];
    list.push(w);
    byOrg.set(w.org, list);
  }

  const curated = BELT_STATUS[slug] ?? {};
  const orgs = new Set([...byOrg.keys(), ...Object.keys(curated)]);

  return [...orgs]
    .sort((a, b) => (ORG_LABELS[a] ?? a).localeCompare(ORG_LABELS[b] ?? b))
    .map((org) => ({
      org,
      label: ORG_LABELS[org] ?? org,
      status: curated[org],
      wins: byOrg.get(org) ?? [],
    }));
}
