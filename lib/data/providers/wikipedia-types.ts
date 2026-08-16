import type { BoxerRecord, Stance, WeightClass } from "../types";

/** Données extraites d'une infobox Wikipedia, telles que stockées dans le
 *  snapshot `wikipedia-records.json` (généré par refresh-wikipedia.ts).
 *  `name` = nom tel que fourni par la source (Big Balls / mock) → sert à
 *  construire une fiche minimale quand le boxeur n'est pas dans le mock. */
export interface WikipediaRecord {
  name: string;
  record: Partial<BoxerRecord>;
  heightCm?: number;
  reachCm?: number;
  stance?: Stance;
  weightClass?: WeightClass;
  nickname?: string;
}
