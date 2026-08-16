/**
 * Statut ACTUEL des ceintures par organisation — données curées.
 *
 * L'historique des victoires en combat de titre se dérive des shards du
 * pipeline (voir belts.ts), mais le statut du moment (détenu / vacant /
 * abandonné) n'est pas structuré dans les résultats : il vient des articles
 * Wikipedia (texte). On le cure ici par slug de boxeur.
 *
 * Structure : slug boxeur → organisation → { state, detail }.
 * Ajouter une entrée = vérifier le texte source (Wikipedia) à la date du jour.
 */
export interface BeltStatus {
  /** « Champion », « Vacant », « Intérimaire »… */
  state: string;
  /** Explication datée (source : article Wikipedia du boxeur). */
  detail: string;
}

export const BELT_STATUS: Record<string, Record<string, BeltStatus>> = {
  "oleksandr-usyk": {
    wba: {
      state: "Vacant",
      detail:
        "Usyk a détenu la ceinture (super-champion) avant de l'abandonner volontairement en juin 2026.",
    },
    wbc: {
      state: "Vacant",
      detail:
        "Remportée et unifiée par Usyk, il y a également renoncé en juin 2026 afin de ne pas bloquer la catégorie.",
    },
    ibf: {
      state: "Vacant",
      detail:
        "Détenue et défendue avec succès, Usyk l'a laissée libre pour les challengers en attente.",
    },
    wbo: {
      state: "Vacant",
      detail:
        "Usyk avait déjà choisi de se séparer de cette ceinture en décembre 2025.",
    },
  },
};
