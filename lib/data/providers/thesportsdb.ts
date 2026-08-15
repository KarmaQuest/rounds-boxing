import type { Fighter, Fight, Stance, WeightClass } from "../types";
import { flagForCountry, slugify } from "../utils";
import { fetchJson } from "./router";
import type { DataProvider } from "./provider";

/**
 * TheSportsDB — base de données sportive communautaire gratuite.
 * Docs : https://www.thesportsdb.com/free_sports_api
 *
 * - Recherche de joueurs : /searchplayers.php?p={nom}&s=Boxing
 * - Profil joueur : /lookupplayer.php?id={id}
 * - Événements d'un joueur : /eventsplayer.php?id={id}
 *
 * ⚠️ Données crowd-sourced : couverture de la boxe inégale, champs variables.
 * Mapping 100 % défensif — on ne plante jamais, on retourne [] / null.
 */

const BASE = "https://www.thesportsdb.com/api/v1/json";

interface TsdbPlayer {
  idPlayer?: string;
  strPlayer?: string;
  strNickname?: string;
  strNationality?: string;
  strWeight?: string; // ex "76 kg" ou "168 lbs"
  strHeight?: string; // ex "180 cm" ou "5' 10\""
  strStance?: string;
  dateBorn?: string; // champ réel v1 (pas strBirthDate)
  strSport?: string;
  strTeam?: string;
  strDescriptionEN?: string;
  strDescriptionFR?: string;
  strFacebook?: string;
}

interface TsdbEvent {
  idEvent?: string;
  strEvent?: string; // "NomA vs NomB"
  dateEvent?: string;
  strVenue?: string;
  strLeague?: string;
  intHomeScore?: string;
  intAwayScore?: string;
  strHomeTeam?: string;
  strAwayTeam?: string;
  strStatus?: string;
}

function parseHeight(raw?: string): number {
  if (!raw) return 175;
  const m = raw.match(/(\d+(?:\.\d+)?)\s*(cm|m)/i);
  if (m) return m[2].toLowerCase() === "m" ? Number(m[1]) * 100 : Number(m[1]);
  const ft = raw.match(/(\d+)'\s*(\d+)"/);
  if (ft) return Math.round(Number(ft[1]) * 30.48 + Number(ft[2]) * 2.54);
  return 175;
}

function parseWeightKg(raw?: string): number | null {
  if (!raw) return null;
  const m = raw.match(/(\d+(?:\.\d+)?)\s*(kg|lbs)/i);
  if (!m) return null;
  return m[2].toLowerCase() === "kg" ? Number(m[1]) : Math.round(Number(m[1]) * 0.4536);
}

function weightClassFromKg(kg: number | null): WeightClass {
  if (!kg) return "Poids lourds";
  if (kg > 90.7) return "Poids lourds";
  if (kg > 79.4) return "Poids lourds-légers";
  if (kg > 76.2) return "Poids mi-lourds";
  if (kg > 72.6) return "Poids super-moyens";
  if (kg > 69.9) return "Poids moyens";
  if (kg > 66.7) return "Poids super-welters";
  if (kg > 63.5) return "Poids welters";
  if (kg > 61.2) return "Poids super-légers";
  if (kg > 59.0) return "Poids légers";
  if (kg > 57.2) return "Poids super-plumes";
  if (kg > 55.3) return "Poids plumes";
  if (kg > 53.5) return "Poids super-coqs";
  if (kg > 52.2) return "Poids coqs";
  if (kg > 50.8) return "Poids super-mouches";
  if (kg > 49.0) return "Poids mouches";
  return "Poids mi-mouches";
}

function mapStance(raw?: string): Stance {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("southpaw") || s.includes("gauch")) return "Southpaw";
  if (s.includes("switch")) return "Switch";
  return "Orthodoxe";
}

function toFighter(p: TsdbPlayer): Fighter {
  const name = p.strPlayer ?? "Inconnu";
  const country = p.strNationality ?? "Inconnu";
  return {
    id: `tsdb-${p.idPlayer ?? slugify(name)}`,
    slug: slugify(name),
    name,
    nickname: p.strNickname || undefined,
    country,
    flag: flagForCountry(country),
    weightClass: weightClassFromKg(parseWeightKg(p.strWeight)),
    stance: mapStance(p.strStance),
    heightCm: parseHeight(p.strHeight),
    reachCm: 0, // non fourni par TheSportsDB
    age: p.dateBorn
      ? Math.max(18, new Date().getFullYear() - new Date(p.dateBorn).getFullYear())
      : 28,
    debutYear: 2015,
    record: { wins: 0, losses: 0, draws: 0, ko: 0 },
    titles: [],
    bio: p.strDescriptionFR || p.strDescriptionEN || undefined,
    source: "thesportsdb",
  };
}

export class TheSportsDbProvider implements DataProvider {
  readonly name = "thesportsdb";
  readonly priority = 2;
  readonly capabilities = ["fighters", "fights"] as const;
  readonly dailyLimit = Number(process.env.THESPORTSDB_DAILY_LIMIT ?? 500);

  isActive(): boolean {
    return Boolean(process.env.THESPORTSDB_API_KEY);
  }

  private url(path: string): string {
    return `${BASE}/${process.env.THESPORTSDB_API_KEY}/${path}`;
  }

  async searchFighters(query: string, limit = 50): Promise<Fighter[]> {
    const data = await fetchJson<{ player?: TsdbPlayer[] }>(
      this.url(`searchplayers.php?p=${encodeURIComponent(query)}&s=Boxing`)
    );
    return (data.player ?? []).slice(0, limit).map(toFighter);
  }

  async listFighters(): Promise<Fighter[]> {
    // Pas d'endpoint "liste" fiable → on retourne vide, le routeur bascule.
    return [];
  }

  async getFighter(slug: string): Promise<Fighter | null> {
    const found = await this.searchFighters(slug.replace(/-/g, " "), 10);
    return found.find((x) => x.slug === slug) ?? found[0] ?? null;
  }

  private eventToFight(e: TsdbEvent): Fight | null {
    const [nameA, nameB] = (e.strEvent ?? `${e.strHomeTeam ?? "?"} vs ${e.strAwayTeam ?? "?"}`)
      .split(/ vs | VS | - /)
      .map((s) => s.trim());
    if (!nameA || !nameB) return null;
    return {
      id: `tsdb-${e.idEvent ?? slugify(e.strEvent ?? "")}`,
      date: e.dateEvent ?? new Date().toISOString(),
      status: "finished",
      venue: e.strVenue || undefined,
      location: e.strLeague || undefined,
      fighters: [
        { name: nameA, flag: flagForCountry("Inconnu") },
        { name: nameB, flag: flagForCountry("Inconnu") },
      ],
      outcome: {
        winnerIndex: e.intHomeScore !== e.intAwayScore ? (Number(e.intHomeScore) > Number(e.intAwayScore) ? 0 : 1) : undefined,
        method: "Décision",
      },
      source: "thesportsdb",
    };
  }

  async getUpcomingFights(): Promise<Fight[]> {
    return []; // les événements futurs ne sont pas fiables ici
  }

  async getRecentFights(): Promise<Fight[]> {
    // Pas d'endpoint boxing fiable → le routeur bascule vers le mock.
    return [];
  }
}
