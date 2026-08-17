import type { BoxerRecord, Stance, WeightClass } from "../types";

/** Un combat du palmarès complet (tableau « Professional boxing record »
 *  de Wikipedia), tel que stocké dans le snapshot `wikipedia-records.json`. */
export interface WikipediaBout {
  /** Résultat du point de vue du boxeur de la fiche. */
  result: "Win" | "Loss" | "Draw" | "NC";
  opponent: string;
  /** Méthode : KO, TKO, UD, SD, MD, PTS… */
  type?: string;
  /** Round d'arrêt (pour un verdict aux points, absent). */
  round?: number;
  /** Date ISO yyyy-mm-dd. */
  date: string;
  location?: string;
  /** Ceintures en jeu (notes « Retained/Defended … titles »). */
  title?: string;
  notes?: string;
}

/** Données extraites d'une infobox Wikipedia, telles que stockées dans le
 *  snapshot `wikipedia-records.json` (généré par refresh-wikipedia.ts).
 *  `name` = nom tel que fourni par la source (Big Balls / mock) → sert à
 *  construire une fiche minimale quand le boxeur n'est pas dans le mock.
 *  `bouts` = palmarès professionnel COMPLET (tableau Wikipedia), présent
 *  quand l'article contient un tableau « Professional boxing record ». */
export interface WikipediaRecord {
  name: string;
  record: Partial<BoxerRecord>;
  heightCm?: number;
  reachCm?: number;
  stance?: Stance;
  weightClass?: WeightClass;
  nickname?: string;
  bouts?: WikipediaBout[];
}
