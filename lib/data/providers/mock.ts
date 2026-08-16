import type { Fighter, Fight } from "../types";
import { flagForCountry, slugify } from "../utils";
import type { DataProvider } from "./provider";

/**
 * Provider de DÉMO.
 *
 * Utilisé par défaut (aucune clé API requise) et en dernier recours quand
 * toutes les sources réelles échouent. Les palmarès sont approximatifs et
 * datés de mi-2026 — c'est du jeu de données, pas une source officielle.
 */

function f(
  partial: Omit<Fighter, "id" | "slug" | "flag"> & { country: string }
): Fighter {
  return {
    ...partial,
    id: `mock-${slugify(partial.name)}`,
    slug: slugify(partial.name),
    flag: flagForCountry(partial.country),
    source: "mock",
  };
}

/** Liste des boxeurs de démo — exportée pour que le provider Wikipedia
 *  puisse s'en servir de base (records réels par-dessus la fiche complète). */
export const FIGHTERS: Fighter[] = [
  // ── Poids lourds ──────────────────────────────────────────────
  f({
    name: "Oleksandr Usyk",
    nickname: "The Cat",
    country: "Ukraine",
    weightClass: "Poids lourds",
    stance: "Southpaw",
    heightCm: 190,
    reachCm: 198,
    age: 39,
    debutYear: 2013,
    record: { wins: 23, losses: 0, draws: 0, ko: 14 },
    titles: ["Champion incontesté des lourds", "Ancien champion incontesté des lourds-légers"],
    rank: 1,
    promoter: "K2 Promotions",
    bio: "Premier champion incontesté des poids lourds de l'ère des quatre ceintures. Vainqueur de Joshua deux fois puis de Tyson Fury deux fois, Usyk a unifié la catégorie reine avant de devenir le visage de la boxe mondiale.",
  }),
  f({
    name: "Tyson Fury",
    nickname: "The Gypsy King",
    country: "Royaume-Uni",
    weightClass: "Poids lourds",
    stance: "Orthodoxe",
    heightCm: 206,
    reachCm: 216,
    age: 37,
    debutYear: 2008,
    record: { wins: 34, losses: 2, draws: 1, ko: 24 },
    titles: ["Ancien champion WBC des lourds"],
    rank: 10,
    promoter: "Queensberry Promotions",
    bio: "Géant de 2,06 m au jeu de jambes surréaliste pour sa taille. A détrôné Wladimir Klitschko en 2015 puis régné sur le WBC avant ses deux défaites face à Usyk.",
  }),
  f({
    name: "Anthony Joshua",
    nickname: "AJ",
    country: "Royaume-Uni",
    weightClass: "Poids lourds",
    stance: "Orthodoxe",
    heightCm: 198,
    reachCm: 208,
    age: 36,
    debutYear: 2013,
    record: { wins: 28, losses: 4, draws: 0, ko: 25 },
    titles: ["Ancien champion unifié des lourds", "Médaille d'or olympique 2012"],
    rank: 12,
    promoter: "Matchroom Boxing",
    bio: "Icône britannique et star olympique de Londres 2012. Ancien détenteur des ceintures WBA, IBF et WBO, toujours actif dans l'ère des combats à Riyad.",
  }),
  f({
    name: "Daniel Dubois",
    nickname: "Dynamite",
    country: "Royaume-Uni",
    weightClass: "Poids lourds",
    stance: "Orthodoxe",
    heightCm: 196,
    reachCm: 198,
    age: 28,
    debutYear: 2017,
    record: { wins: 23, losses: 2, draws: 0, ko: 22 },
    titles: ["Champion WBC des lourds"],
    rank: 9,
    promoter: "Queensberry Promotions",
    bio: "Puncheur jeune et féroce, passé par une défaite controversée face à Usyk avant de renverser Joseph Parker et de s'emparer de la couronne WBC.",
  }),
  f({
    name: "Tony Yoka",
    country: "France",
    weightClass: "Poids lourds",
    stance: "Orthodoxe",
    heightCm: 200,
    reachCm: 206,
    age: 34,
    debutYear: 2017,
    record: { wins: 13, losses: 3, draws: 0, ko: 9 },
    titles: ["Médaille d'or olympique 2016", "Ancien champion de France"],
    rank: 24,
    promoter: "Yoka Boxing",
    bio: "Champion olympique à Rio en 2016, Tony Yoka a porté la boxe française chez les lourds avant de connaître un passage à vide. Toujours en quête de rachat.",
  }),

  // ── Poids lourds-légers ───────────────────────────────────────
  f({
    name: "Jai Opetaia",
    nickname: "The Highest Order",
    country: "Australie",
    weightClass: "Poids lourds-légers",
    stance: "Southpaw",
    heightCm: 188,
    reachCm: 188,
    age: 31,
    debutYear: 2015,
    record: { wins: 28, losses: 0, draws: 0, ko: 22 },
    titles: ["Champion IBF des lourds-légers"],
    rank: 11,
    promoter: "Matchroom Boxing",
    bio: "Le roi australien des lourds-légers, invaincu et dévastateur. Toutes les grandes organisations veulent l'unifier contre lui.",
  }),

  // ── Poids mi-lourds ───────────────────────────────────────────
  f({
    name: "Dmitry Bivol",
    nickname: "The Art of Boxing",
    country: "Russie",
    weightClass: "Poids mi-lourds",
    stance: "Orthodoxe",
    heightCm: 183,
    reachCm: 183,
    age: 35,
    debutYear: 2014,
    record: { wins: 24, losses: 1, draws: 0, ko: 12 },
    titles: ["Champion incontesté des mi-lourds", "Ancien champion WBA"],
    rank: 5,
    promoter: "World of Boxing",
    bio: "Élève du grand Gennady Golovkin, Bivol a battu Canelo en 2022 avant de prendre sa revanche sur Beterbiev pour devenir champion incontesté des mi-lourds.",
  }),
  f({
    name: "Artur Beterbiev",
    nickname: "Le Bourreau",
    country: "Canada",
    weightClass: "Poids mi-lourds",
    stance: "Orthodoxe",
    heightCm: 183,
    reachCm: 185,
    age: 41,
    debutYear: 2009,
    record: { wins: 21, losses: 1, draws: 0, ko: 20 },
    titles: ["Ancien champion incontesté des mi-lourds"],
    rank: 6,
    promoter: "Top Rank",
    bio: "Seul champion de l'histoire à avoir 100 % de victoires par KO sur ses 20 premières sorties. Champion incontesté des mi-lourds avant sa défaite en revanche face à Bivol.",
  }),
  f({
    name: "David Benavidez",
    nickname: "The Mexican Monster",
    country: "États-Unis",
    weightClass: "Poids mi-lourds",
    stance: "Orthodoxe",
    heightCm: 188,
    reachCm: 189,
    age: 29,
    debutYear: 2013,
    record: { wins: 30, losses: 0, draws: 0, ko: 24 },
    titles: ["Ancien champion WBC des super-moyens"],
    rank: 7,
    promoter: "Premier Boxing Champions",
    bio: "Le 'Monstre mexicain' : volume de frappe écrasant, double champion WBC des super-moyens avant de monter chez les mi-lourds et d'y battre David Morrell.",
  }),

  // ── Poids super-moyens ────────────────────────────────────────
  f({
    name: "Canelo Álvarez",
    nickname: "Canelo",
    country: "Mexique",
    weightClass: "Poids super-moyens",
    stance: "Orthodoxe",
    heightCm: 173,
    reachCm: 179,
    age: 36,
    debutYear: 2005,
    record: { wins: 62, losses: 2, draws: 2, ko: 39 },
    titles: ["Champion incontesté des super-moyens", "Ancien champion incontesté des moyens"],
    rank: 4,
    promoter: "Canelo Promotions",
    bio: "La plus grande star de la boxe actuelle. Champion incontesté des super-moyens depuis 2021, il reste le boxeur le plus bankable du monde, adversaire de Crawford fin 2026.",
  }),
  f({
    name: "Christian Mbilli",
    nickname: "Solide",
    country: "France",
    weightClass: "Poids super-moyens",
    stance: "Orthodoxe",
    heightCm: 184,
    reachCm: 184,
    age: 31,
    debutYear: 2016,
    record: { wins: 29, losses: 0, draws: 0, ko: 24 },
    titles: ["Champion WBC International", "Champion WBA International"],
    rank: 21,
    promoter: "Boxing Stars",
    bio: "Le fer de lance de la boxe française. Invaincu et spectaculaire, 'Solide' Mbilli écrase tout sur son passage chez les super-moyens et vise les ceintures mondiales.",
  }),

  // ── Poids moyens ──────────────────────────────────────────────
  f({
    name: "Janibek Alimkhanuly",
    nickname: "Qazaq Style",
    country: "Kazakhstan",
    weightClass: "Poids moyens",
    stance: "Southpaw",
    heightCm: 182,
    reachCm: 182,
    age: 33,
    debutYear: 2016,
    record: { wins: 16, losses: 0, draws: 0, ko: 11 },
    titles: ["Champion WBO des moyens", "Champion IBF des moyens"],
    rank: 22,
    promoter: "Top Rank",
  }),

  // ── Poids super-welters ───────────────────────────────────────
  f({
    name: "Terence Crawford",
    nickname: "Bud",
    country: "États-Unis",
    weightClass: "Poids super-welters",
    stance: "Southpaw",
    heightCm: 173,
    reachCm: 188,
    age: 38,
    debutYear: 2008,
    record: { wins: 41, losses: 0, draws: 0, ko: 31 },
    titles: ["Champion WBA des super-welters", "Ancien champion incontesté des welters"],
    rank: 2,
    promoter: "BLK Prime",
    bio: "Considéré par beaucoup comme le meilleur boxeur pound-for-pound. Champion incontesté des welters après avoir détruit Errol Spence, il monte défier Canelo en 2026.",
  }),
  f({
    name: "Vergil Ortiz Jr",
    nickname: "El Chino",
    country: "États-Unis",
    weightClass: "Poids super-welters",
    stance: "Orthodoxe",
    heightCm: 178,
    reachCm: 178,
    age: 28,
    debutYear: 2016,
    record: { wins: 23, losses: 0, draws: 0, ko: 21 },
    titles: ["Champion WBC Intérim des super-welters"],
    rank: 19,
    promoter: "Golden Boy",
  }),

  // ── Poids welters ─────────────────────────────────────────────
  f({
    name: "Jaron Ennis",
    nickname: "Boots",
    country: "États-Unis",
    weightClass: "Poids welters",
    stance: "Orthodoxe",
    heightCm: 178,
    reachCm: 188,
    age: 29,
    debutYear: 2016,
    record: { wins: 33, losses: 0, draws: 0, ko: 29 },
    titles: ["Champion IBF des welters"],
    rank: 17,
    promoter: "Matchroom Boxing",
  }),
  f({
    name: "Errol Spence Jr",
    nickname: "The Truth",
    country: "États-Unis",
    weightClass: "Poids welters",
    stance: "Southpaw",
    heightCm: 177,
    reachCm: 183,
    age: 36,
    debutYear: 2012,
    record: { wins: 28, losses: 1, draws: 0, ko: 22 },
    titles: ["Ancien champion unifié des welters"],
    rank: 18,
    promoter: "Premier Boxing Champions",
  }),
  f({
    name: "Souleymane Cissokho",
    nickname: "Souly",
    country: "France",
    weightClass: "Poids welters",
    stance: "Orthodoxe",
    heightCm: 181,
    reachCm: 181,
    age: 35,
    debutYear: 2015,
    record: { wins: 18, losses: 1, draws: 0, ko: 11 },
    titles: ["Champion WBA International"],
    rank: 23,
    promoter: "Probellum",
  }),

  // ── Poids super-légers ────────────────────────────────────────
  f({
    name: "Devin Haney",
    nickname: "The Dream",
    country: "États-Unis",
    weightClass: "Poids super-légers",
    stance: "Orthodoxe",
    heightCm: 173,
    reachCm: 180,
    age: 27,
    debutYear: 2015,
    record: { wins: 31, losses: 1, draws: 0, ko: 15 },
    titles: ["Champion WBC des super-légers"],
    rank: 14,
    promoter: "Haney Promotions",
  }),
  f({
    name: "Teofimo Lopez",
    nickname: "The Takeover",
    country: "États-Unis",
    weightClass: "Poids super-légers",
    stance: "Orthodoxe",
    heightCm: 173,
    reachCm: 174,
    age: 28,
    debutYear: 2016,
    record: { wins: 21, losses: 1, draws: 0, ko: 13 },
    titles: ["Champion WBO des super-légers"],
    rank: 16,
    promoter: "Top Rank",
  }),
  f({
    name: "Ryan Garcia",
    nickname: "KingRy",
    country: "États-Unis",
    weightClass: "Poids super-légers",
    stance: "Orthodoxe",
    heightCm: 178,
    reachCm: 178,
    age: 27,
    debutYear: 2016,
    record: { wins: 24, losses: 2, draws: 0, ko: 20 },
    titles: ["Ancien champion intérimaire WBC"],
    rank: 20,
    promoter: "Golden Boy",
  }),

  // ── Poids légers ──────────────────────────────────────────────
  f({
    name: "Gervonta Davis",
    nickname: "Tank",
    country: "États-Unis",
    weightClass: "Poids légers",
    stance: "Southpaw",
    heightCm: 166,
    reachCm: 171,
    age: 31,
    debutYear: 2013,
    record: { wins: 30, losses: 0, draws: 0, ko: 28 },
    titles: ["Champion WBA des légers"],
    rank: 8,
    promoter: "Premier Boxing Champions",
    bio: "Le puncheur le plus redouté des petits poids : 28 KO en 30 combats. 'Tank' est une attraction commerciale hors norme malgré une carrière gérée au compte-gouttes.",
  }),
  f({
    name: "Shakur Stevenson",
    nickname: "Sugar",
    country: "États-Unis",
    weightClass: "Poids légers",
    stance: "Southpaw",
    heightCm: 173,
    reachCm: 173,
    age: 29,
    debutYear: 2017,
    record: { wins: 22, losses: 0, draws: 0, ko: 10 },
    titles: ["Champion WBC des légers"],
    rank: 13,
    promoter: "Top Rank",
  }),
  f({
    name: "Vasyl Lomachenko",
    nickname: "Loma",
    country: "Ukraine",
    weightClass: "Poids légers",
    stance: "Southpaw",
    heightCm: 170,
    reachCm: 166,
    age: 38,
    debutYear: 2013,
    record: { wins: 18, losses: 3, draws: 0, ko: 12 },
    titles: ["Ancien champion unifié des légers", "Double champion olympique"],
    rank: 15,
    promoter: "Top Rank",
    bio: "Génie technique, double champion olympique (2008, 2012) et triple champion du monde. Son art du ring a redéfini la boxe moderne.",
  }),

  // ── Poids super-coqs ──────────────────────────────────────────
  f({
    name: "Naoya Inoue",
    nickname: "The Monster",
    country: "Japon",
    weightClass: "Poids super-coqs",
    stance: "Orthodoxe",
    heightCm: 165,
    reachCm: 171,
    age: 33,
    debutYear: 2012,
    record: { wins: 29, losses: 0, draws: 0, ko: 26 },
    titles: ["Champion incontesté des super-coqs"],
    rank: 3,
    promoter: "Ohashi Gym",
    bio: "Le 'Monstre' japonais : incontesté dans deux catégories (coqs puis super-coqs), 26 KO en 29 combats. Beaucoup le placent dans le top 5 des meilleurs boxeurs de l'histoire.",
  }),
];

function ref(name: string, fighter?: Fighter) {
  return {
    fighterId: fighter?.id,
    name,
    flag: fighter?.flag,
    record: fighter?.record,
  };
}

const byName = (n: string) => FIGHTERS.find((x) => x.name === n);

/** Combats récents (résultats). Exporté pour le profil boxeur (fusion avec les shards). */
export const RECENT_FIGHTS: Fight[] = [
  {
    id: "f-2024-12-21-usyk-fury2",
    date: "2024-12-21",
    status: "finished",
    weightClass: "Poids lourds",
    title: "Championnat incontesté des poids lourds",
    venue: "Kingdom Arena",
    location: "Riyad, Arabie saoudite",
    fighters: [ref("Oleksandr Usyk", byName("Oleksandr Usyk")), ref("Tyson Fury", byName("Tyson Fury"))],
    outcome: { winnerIndex: 0, method: "UD", round: 12 },
    source: "mock",
  },
  {
    id: "f-2025-02-22-beterbiev-bivol2",
    date: "2025-02-22",
    status: "finished",
    weightClass: "Poids mi-lourds",
    title: "Championnat incontesté des mi-lourds",
    venue: "Kingdom Arena",
    location: "Riyad, Arabie saoudite",
    fighters: [ref("Artur Beterbiev", byName("Artur Beterbiev")), ref("Dmitry Bivol", byName("Dmitry Bivol"))],
    outcome: { winnerIndex: 1, method: "MD", round: 12 },
    source: "mock",
  },
  {
    id: "f-2025-02-01-benavidez-morrell",
    date: "2025-02-01",
    status: "finished",
    weightClass: "Poids mi-lourds",
    title: "WBC & WBA mi-lourds (éliminatoire)",
    venue: "T-Mobile Arena",
    location: "Las Vegas, États-Unis",
    fighters: [ref("David Benavidez", byName("David Benavidez")), ref("David Morrell")],
    outcome: { winnerIndex: 0, method: "UD", round: 12 },
    source: "mock",
  },
  {
    id: "f-2025-03-22-dubois-parker",
    date: "2025-03-22",
    status: "finished",
    weightClass: "Poids lourds",
    title: "Championnat WBC des poids lourds",
    venue: "Kingdom Arena",
    location: "Riyad, Arabie saoudite",
    fighters: [ref("Daniel Dubois", byName("Daniel Dubois")), ref("Joseph Parker")],
    outcome: { winnerIndex: 0, method: "TKO", round: 9 },
    source: "mock",
  },
  {
    id: "f-2024-09-14-canelo-berlanga",
    date: "2024-09-14",
    status: "finished",
    weightClass: "Poids super-moyens",
    title: "Championnat incontesté des super-moyens",
    venue: "T-Mobile Arena",
    location: "Las Vegas, États-Unis",
    fighters: [ref("Canelo Álvarez", byName("Canelo Álvarez")), ref("Edgar Berlanga")],
    outcome: { winnerIndex: 0, method: "UD", round: 12 },
    source: "mock",
  },
  {
    id: "f-2024-09-28-mbilli-derevyanchenko",
    date: "2024-09-28",
    status: "finished",
    weightClass: "Poids super-moyens",
    title: "WBC International super-moyens",
    venue: "Centre Bell",
    location: "Montréal, Canada",
    fighters: [ref("Christian Mbilli", byName("Christian Mbilli")), ref("Sergiy Derevyanchenko")],
    outcome: { winnerIndex: 0, method: "UD", round: 10 },
    source: "mock",
  },
];

/** Combats à venir (avec cotes). */
const UPCOMING_FIGHTS: Fight[] = [
  {
    id: "f-2026-09-13-canelo-crawford",
    date: "2026-09-13",
    status: "upcoming",
    weightClass: "Poids super-moyens",
    title: "Superfight incontesté : Canelo vs Crawford",
    venue: "T-Mobile Arena",
    location: "Las Vegas, États-Unis",
    fighters: [ref("Canelo Álvarez", byName("Canelo Álvarez")), ref("Terence Crawford", byName("Terence Crawford"))],
    odds: [1.9, 1.88],
    source: "mock",
  },
  {
    id: "f-2026-10-10-usyk-bakole",
    date: "2026-10-10",
    status: "upcoming",
    weightClass: "Poids lourds",
    title: "Championnat WBC, WBA & WBO des lourds",
    venue: "Kingdom Arena",
    location: "Riyad, Arabie saoudite",
    fighters: [ref("Oleksandr Usyk", byName("Oleksandr Usyk")), ref("Martin Bakole")],
    odds: [1.18, 5.4],
    source: "mock",
  },
  {
    id: "f-2026-11-14-bivol-benavidez",
    date: "2026-11-14",
    status: "upcoming",
    weightClass: "Poids mi-lourds",
    title: "Championnat incontesté des mi-lourds",
    venue: "Kingdom Arena",
    location: "Riyad, Arabie saoudite",
    fighters: [ref("Dmitry Bivol", byName("Dmitry Bivol")), ref("David Benavidez", byName("David Benavidez"))],
    odds: [2.1, 1.72],
    source: "mock",
  },
  {
    id: "f-2026-12-13-inoue-nakatani",
    date: "2026-12-13",
    status: "upcoming",
    weightClass: "Poids super-coqs",
    title: "Championnat incontesté des super-coqs",
    venue: "Tokyo Dome",
    location: "Tokyo, Japon",
    fighters: [ref("Naoya Inoue", byName("Naoya Inoue")), ref("Junto Nakatani")],
    odds: [1.45, 2.7],
    source: "mock",
  },
  {
    id: "f-2026-09-26-dubois-anderson",
    date: "2026-09-26",
    status: "upcoming",
    weightClass: "Poids lourds",
    title: "Championnat WBC des lourds",
    venue: "O2 Arena",
    location: "Londres, Royaume-Uni",
    fighters: [ref("Daniel Dubois", byName("Daniel Dubois")), ref("Jared Anderson")],
    odds: [1.25, 4.1],
    source: "mock",
  },
  {
    id: "f-2026-10-24-mbilli-berlanga",
    date: "2026-10-24",
    status: "upcoming",
    weightClass: "Poids super-moyens",
    title: "Éliminatoire WBC super-moyens",
    venue: "Accor Arena",
    location: "Paris, France",
    fighters: [ref("Christian Mbilli", byName("Christian Mbilli")), ref("Edgar Berlanga")],
    odds: [1.6, 2.35],
    source: "mock",
  },
];

export class MockProvider implements DataProvider {
  readonly name = "mock";
  readonly priority = 99; // toujours en dernier recours
  readonly capabilities = ["fighters", "fights", "odds"] as const;
  readonly dailyLimit = 0; // illimité

  isActive(): boolean {
    return true;
  }

  async searchFighters(query: string, limit = 50): Promise<Fighter[]> {
    const q = query.toLowerCase().trim();
    if (!q) return FIGHTERS.slice(0, limit);
    return FIGHTERS.filter((x) =>
      `${x.name} ${x.nickname ?? ""} ${x.country}`.toLowerCase().includes(q)
    ).slice(0, limit);
  }

  async listFighters(limit = 200): Promise<Fighter[]> {
    return FIGHTERS.slice(0, limit);
  }

  async getFighter(slug: string): Promise<Fighter | null> {
    return FIGHTERS.find((x) => x.slug === slug) ?? null;
  }

  async getUpcomingFights(limit = 20): Promise<Fight[]> {
    return UPCOMING_FIGHTS.slice(0, limit);
  }

  async getRecentFights(limit = 20): Promise<Fight[]> {
    return RECENT_FIGHTS.slice(0, limit);
  }
}
