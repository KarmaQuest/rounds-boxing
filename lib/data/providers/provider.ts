import type { Fighter, Fight, WeightClass } from "../types";

export type Capability = "fighters" | "fights" | "odds";

/**
 * Contrat commun à toutes les sources de données (réelles ou mock).
 * Chaque provider sait chercher des boxeurs, en lister, en récupérer un,
 * et fournir les combats à venir / récents.
 *
 * Les fournisseurs réels sont défensifs : en cas d'erreur ou de champ
 * manquant ils retournent [] / null pour laisser le routeur basculer.
 */
export interface DataProvider {
  /** identifiant court, ex "bigballs" */
  name: string;
  /** priorité d'appel (1 = essayé en premier) */
  priority: number;
  /** ce que ce provider sait servir */
  capabilities: readonly Capability[];
  /** limite gratuite quotidienne (0 = pas de quota connu) */
  dailyLimit: number;
  /** indique si le provider est activé (clé API présente) */
  isActive(): boolean;

  searchFighters(query: string, limit?: number): Promise<Fighter[]>;
  listFighters(limit?: number): Promise<Fighter[]>;
  getFighter(slug: string): Promise<Fighter | null>;
  getUpcomingFights(limit?: number): Promise<Fight[]>;
  getRecentFights(limit?: number): Promise<Fight[]>;
}

/** Liste canonique des catégories pour validation/affichage. */
export const KNOWN_WEIGHT_CLASSES: WeightClass[] = [
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
];
