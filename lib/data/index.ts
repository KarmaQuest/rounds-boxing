import "server-only";
import { MockProvider } from "./providers/mock";
import { BigBallsProvider } from "./providers/bigballs";
import { TheSportsDbProvider } from "./providers/thesportsdb";
import { OddsApiProvider } from "./providers/oddsapi";
import { WikipediaProvider } from "./providers/wikipedia";
import { ProviderRouter } from "./providers/router";
import type { FighterFilters } from "./types";
import { applyFilters, dedupeFighters } from "./utils";

/**
 * Couche de données unique pour toute l'app.
 *
 * Ordre de priorité par besoin :
 * - profils boxeurs : Big Balls → TheSportsDB → Wikipedia (records réels
 *   des stars) → mock
 * - combats récents : mock (TheSportsDB quand l'API l'offre)
 * - combats à venir + cotes : The Odds API → mock
 *
 * Les providers sans clé API sont ignorés automatiquement (isActive()).
 */
const router = new ProviderRouter([
  new BigBallsProvider(),
  new TheSportsDbProvider(),
  new WikipediaProvider(),
  new OddsApiProvider(),
  new MockProvider(),
]);

export async function searchBoxeurs(filters: FighterFilters) {
  // On charge TOUJOURS le maximum disponible (liste source mise en cache
  // TTL 1 h) : la pagination et le tri se font APRÈS, sur un jeu stable —
  // sinon chaque page re-trierait un fenêtrage différent (incohérent).
  // Pool visible : 1500 boxeurs (Big Balls paginé + snapshot Wikipedia +
  // mock). Assez large pour inclure les boxeurs connus hors top 100
  // alphabétique (ex. Bakary Samaké), et la liste est mise en cache 1 h.
  const FETCH_LIMIT = 1500;

  if (!filters.q) {
    const { fighters, source } = await router.listFighters(FETCH_LIMIT);
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

  const filtered = applyFilters(merged, filters);
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

/** Providers actifs + quota (pour une page /api/health ou debug). */
export async function dataStatus() {
  return router.status();
}
