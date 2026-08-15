import type { Fighter, Fight, Stance, WeightClass } from "../types";
import { flagForCountry, slugify } from "../utils";
import { fetchJson } from "./router";
import type { DataProvider } from "./provider";

/**
 * Big Balls Sports Data — API Boxing (validé contre l'API réelle).
 * Docs : https://bigballsdata.com/docs/quickstart · https://bigballsdata.com/boxing-api
 *
 * Points validés en live :
 * - Toutes les réponses sont enveloppées dans { data, meta, error }
 * - GET /v1/athletes?sport=boxing&limit={1..100} → profils (12213 au total)
 * - GET /v1/athletes?sport=boxing&name={nom} → recherche par nom
 * - Champs : name (surnom entre guillemets), nationality, dob, height_cm,
 *   reach_cm, stance, weight_class, record (null : pas encore disponible),
 *   external_ids.{wikidata,boxrec}
 * - Gratuit : 1 000 req/jour (2 000 avec compte GitHub)
 */

interface BbsEnvelope<T> {
  data?: T;
  meta?: { count?: number; total?: number; limit?: number };
  error?: { code?: string; message?: string } | null;
}

interface BbsAthlete {
  id?: string;
  name?: string;
  nationality?: string;
  dob?: string;
  height_cm?: number | null;
  reach_cm?: number | null;
  stance?: string | null;
  weight_class?: string | null;
  current_ranking?: number | null;
  record?: unknown; // null tant que les palmarès ne sont pas publiés
  external_ids?: { wikidata?: string | null; boxrec?: string | null };
}

const BASE = "https://api.bigballsdata.com";
const LIST_LIMIT = 100; // maximum accepté par l'API

function mapStance(raw?: string | null): Stance {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("southpaw") || s.includes("gauch")) return "Southpaw";
  if (s.includes("switch") || s.includes("ambidextre")) return "Switch";
  return "Orthodoxe";
}

function mapWeightClass(raw?: string | null): WeightClass {
  const s = (raw ?? "").toLowerCase();
  const map: Array<[RegExp, WeightClass]> = [
    [/heavy/, "Poids lourds"],
    [/cruiser/, "Poids lourds-légers"],
    [/light heavy/, "Poids mi-lourds"],
    [/super middle/, "Poids super-moyens"],
    [/middle/, "Poids moyens"],
    [/super welter|light middle/, "Poids super-welters"],
    [/welter/, "Poids welters"],
    [/super light|light welter/, "Poids super-légers"],
    [/light/, "Poids légers"],
    [/super feather/, "Poids super-plumes"],
    [/feather/, "Poids plumes"],
    [/super bantam/, "Poids super-coqs"],
    [/bantam/, "Poids coqs"],
    [/super fly/, "Poids super-mouches"],
    [/fly/, "Poids mouches"],
    [/minimum|straw/, "Poids mi-mouches"],
  ];
  for (const [re, wc] of map) {
    if (re.test(s)) return wc;
  }
  return "Poids lourds"; // valeur par défaut, remplacée si plus précise ailleurs
}

/** Extrait le surnom du nom quand il est entre guillemets : "Irish" Teddy Mann. */
function parseName(raw: string): { name: string; nickname?: string } {
  const m = raw.match(/^"(.+)"\s+(.+)$/);
  if (m) return { name: m[2]!, nickname: m[1] };
  return { name: raw };
}

function toFighter(a: BbsAthlete): Fighter {
  const rawName = a.name ?? "Inconnu";
  const { name, nickname } = parseName(rawName);
  const country = a.nationality ?? "Inconnu";
  const birthYear = a.dob ? Number(a.dob.slice(0, 4)) : 0;
  return {
    id: a.id ?? `bbs-${slugify(name)}`,
    slug: slugify(name),
    name,
    nickname,
    country,
    flag: flagForCountry(country),
    weightClass: mapWeightClass(a.weight_class),
    stance: mapStance(a.stance),
    heightCm: a.height_cm ?? 0,
    reachCm: a.reach_cm ?? 0,
    age: birthYear ? Math.max(18, new Date().getFullYear() - birthYear) : 28,
    debutYear: birthYear ? birthYear + 21 : 2015,
    record: { wins: 0, losses: 0, draws: 0, ko: 0 },
    titles: [],
    boxrecId: a.external_ids?.boxrec ?? undefined,
    source: "bigballs",
  };
}

export class BigBallsProvider implements DataProvider {
  readonly name = "bigballs";
  readonly priority = 1;
  readonly capabilities = ["fighters"] as const;
  readonly dailyLimit = Number(process.env.BBS_DAILY_LIMIT ?? 1000);

  isActive(): boolean {
    return Boolean(process.env.BBS_API_KEY);
  }

  private headers(): Record<string, string> {
    return { Authorization: `Bearer ${process.env.BBS_API_KEY}` };
  }

  private async getAthletes(params: string): Promise<BbsAthlete[]> {
    const json = await fetchJson<BbsEnvelope<BbsAthlete[]>>(
      `${BASE}/v1/athletes?sport=boxing${params}`,
      { headers: this.headers() }
    );
    if (json.error) throw new Error(`BigBalls: ${json.error.message ?? "erreur"}`);
    return json.data ?? [];
  }

  async listFighters(limit = 200): Promise<Fighter[]> {
    const athletes = await this.getAthletes(`&limit=${Math.min(limit, LIST_LIMIT)}`);
    return athletes.slice(0, limit).map(toFighter);
  }

  async searchFighters(query: string, limit = 50): Promise<Fighter[]> {
    const athletes = await this.getAthletes(
      `&name=${encodeURIComponent(query.trim())}&limit=${Math.min(limit, LIST_LIMIT)}`
    );
    return athletes.slice(0, limit).map(toFighter);
  }

  async getFighter(slug: string): Promise<Fighter | null> {
    // On n'a pas les UUID Big Balls côté client → recherche par nom.
    const name = slug.replace(/-/g, " ");
    const found = await this.searchFighters(name, 10);
    return found.find((x) => x.slug === slug) ?? found[0] ?? null;
  }

  async getUpcomingFights(): Promise<Fight[]> {
    return []; // résultats/cards pas encore disponibles
  }

  async getRecentFights(): Promise<Fight[]> {
    return [];
  }
}
