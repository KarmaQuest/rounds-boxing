/** Catégories de poids, de la plus lourde à la plus légère. */
export const WEIGHT_CLASSES = [
  "Poids lourds",
  "Poids lourds-légers",
  "Poids mi-lourds",
  "Poids super-moyens",
  "Poids moyens",
  "Poids super-welters",
  "Poids welters",
  "Poids super-légers",
  "Poids légers",
  "Poids super-plumes",
  "Poids plumes",
  "Poids super-coqs",
  "Poids coqs",
  "Poids super-mouches",
  "Poids mouches",
  "Poids mi-mouches",
] as const;

export type WeightClass = (typeof WEIGHT_CLASSES)[number];

export type Stance = "Orthodoxe" | "Southpaw" | "Switch";

export interface BoxerRecord {
  wins: number;
  losses: number;
  draws: number;
  /** victoires par KO / arrêt */
  ko: number;
}

export interface Fighter {
  id: string;
  slug: string;
  name: string;
  nickname?: string;
  country: string; // ex: "France"
  flag: string; // emoji
  weightClass: WeightClass;
  stance: Stance;
  heightCm: number;
  reachCm: number;
  age: number;
  debutYear: number;
  record: BoxerRecord;
  /** ceintures actuelles ou historiques majeures */
  titles: string[];
  /** rang pound-for-pound (1 = meilleur) */
  rank?: number;
  promoter?: string;
  avatarSeed?: string;
  bio?: string;
  /** ID BoxRec (cross-référence, ex: Big Balls) */
  boxrecId?: string;
  /** source fournisseuse des données */
  source?: string;
  /** sexe : 'M' homme, 'F' femme, '' inconnu */
  gender?: string;
  /** boxeur amateur (FFBoxe BEA, IBA.PRO…) */
  amateur?: boolean;
}

export type FightStatus = "upcoming" | "finished";

export interface FightOutcome {
  /** index du vainqueur dans fighters[] — absent = nul */
  winnerIndex?: 0 | 1;
  method: string; // KO, TKO, UD, SD, MD, Nul…
  round?: number;
  time?: string;
}

export interface FightFighterRef {
  fighterId?: string;
  name: string;
  flag?: string;
  record?: BoxerRecord;
}

export interface Fight {
  id: string;
  date: string; // ISO
  status: FightStatus;
  weightClass?: WeightClass;
  title?: string; // ex: "Ceinture WBC poids lourds"
  venue?: string;
  location?: string;
  fighters: [FightFighterRef, FightFighterRef];
  outcome?: FightOutcome;
  /** cotes décimales [boxeur A, boxeur B] */
  odds?: [number, number];
  source?: string;
  /** combat amateur (FFBoxe amateur, CSAC…) — shards programmation */
  amateur?: boolean;
  /** type d'annonce (IBF : Defense / Eliminator / Vacant…) */
  boutType?: string;
  promoter?: string;
  /** vrai si validé par le module de vérification (llm/verify) */
  verified?: boolean;
}

/** Critères de filtrage partagés (API + UI). */
export interface FighterFilters {
  q?: string;
  weightClass?: WeightClass | "";
  country?: string;
  minWins?: number;
  minKoPct?: number;
  sort?: "name" | "wins" | "koPct" | "age" | "height" | "rank";
  amateur?: "all" | "pro" | "amateur";
  /** genre : 'all' tous, 'M' hommes, 'F' femmes */
  gender?: "all" | "M" | "F";
  /** pagination : nombre d'éléments à sauter (TASKS 2.1) */
  offset?: number;
  limit?: number;
}
