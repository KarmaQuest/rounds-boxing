import "server-only";
import { MockProvider } from "./providers/mock";
import { BigBallsProvider } from "./providers/bigballs";
import { TheSportsDbProvider } from "./providers/thesportsdb";
import { OddsApiProvider } from "./providers/oddsapi";
import { WikipediaProvider } from "./providers/wikipedia";
import { ShardsFightsProvider } from "./providers/shardsfights";
import { CareersProvider } from "./providers/careers";
import { MergedBoxersProvider } from "./providers/mergedboxers";
import { ProviderRouter } from "./providers/router";
import type { FighterFilters } from "./types";
import { applyFilters, dedupeFighters } from "./utils";

/**
 * Couche de données unique pour toute l'app.
 *
 * Ordre de priorité par besoin :
 * - profils boxeurs : Big Balls → TheSportsDB → Wikipedia (records réels
 *   des stars) → mock
 * - combats récents : **shards officiels du pipeline** (lecture statique
 *   `public/data/fights/`) → TheSportsDB → mock
 * - combats à venir + cotes : The Odds API → **programmation officielle
 *   vérifiée par IA** (shards `fights-upcoming/`) — zéro combat inventé,
 *   le mock ne sert plus la capacité odds
 *
 * Les providers sans clé API sont ignorés automatiquement (isActive()).
 */
const router = new ProviderRouter([
  new BigBallsProvider(),
  new TheSportsDbProvider(),
  new WikipediaProvider(),
  new OddsApiProvider(),
  new ShardsFightsProvider(),
  new MockProvider(),
  // Annuaire complet (merged.json, 22k boxeurs) — dernier recours : trouve
  // les boxeurs absents des APIs live (ex. Bakary Samake) sans jamais
  // écraser un record complet (mock/Wikipedia) ni le pool classé.
  new MergedBoxersProvider(),
]);

export async function searchBoxeurs(filters: FighterFilters) {
  // On charge TOUJOURS le maximum disponible (liste source mise en cache
  // TTL 1 h) : la pagination et le tri se font APRÈS, sur un jeu stable —
  // sinon chaque page re-trierait un fenêtrage différent (incohérent).
  // Pool visible : 1500 boxeurs (Big Balls paginé + snapshot Wikipedia +
  // mock). Assez large pour inclure les boxeurs connus hors top 100
  // alphabétique (ex. Bakary Samaké), et la liste est mise en cache 1 h.
  const FETCH_LIMIT = 1500;

  const needFullPool = filters.amateur || filters.gender;

  if (!filters.q) {
    const { fighters, source } = await router.listFighters(FETCH_LIMIT);
    // Quand le filtre amateur/gender est actif, on complète avec TOUS
    // les boxeurs du merged.json (22k) pour ne rien rater — le pool
    // classé ne contient que 1500 entrées et les amateurs/femmes y
    // sont très dilués.
    if (needFullPool) {
      const annuaire = new MergedBoxersProvider();
      const allMerged = await annuaire.listFighters(30_000);
      const combined = dedupeFighters([...fighters, ...allMerged]);
      const filtered = applyFilters(combined, filters);
      return { fighters: filtered, source: source + " + annuaire" };
    }
    const filtered = applyFilters(fighters, filters);
    return { fighters: filtered, source };
  }

  // Recherche : la requête part aux providers (mot exact) ET on ajoute la
  // liste complète pour que la recherche floue (typos) fonctionne aussi
  // au niveau API — « uzyk » doit trouver Oleksandr Usyk.
  const [fromSearch, fullList] = await Promise.all([
    router.searchFighters(filters.q, FETCH_LIMIT),
    router.listFighters(FETCH_LIMIT),
  ]);
  const merged = dedupeFighters([...fromSearch.fighters, ...fullList.fighters]);
  const sources = new Set(
    [...fromSearch.source.split(" + "), ...fullList.source.split(" + ")].filter(Boolean)
  );

  // Même en mode recherche, si amateur/gender est actif on élargit
  const base = needFullPool ? [...merged, ...(await new MergedBoxersProvider().listFighters(30_000))] : merged;
  const filtered = applyFilters(dedupeFighters(base), filters);
  return { fighters: filtered, source: [...sources].join(" + ") || "aucune" };
}

export async function getBoxeur(slug: string) {
  return router.getFighter(slug);
}

export async function getCombatsAvenir(limit = 20) {
  return router.upcomingFights(limit);
}

export async function getCombatsRecents(limit = 20) {
  return router.recentFights(limit);
}

/** Tous les combats d'un boxeur (carrière complète, brique 3 du plan
 *  d'archive) — lecture statique de boxers/careers.json généré par
 *  `python main.py careers` (pipeline). */
export async function getCarriere(slug: string) {
  const fights = await new CareersProvider().getCareer(slug);
  return { fights, source: fights.length > 0 ? "archive pipeline" : "aucune" };
}

/** Providers actifs + quota (pour une page /api/health ou debug). */
export async function dataStatus() {
  return router.status();
}
