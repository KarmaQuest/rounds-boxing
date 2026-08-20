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
import type { BoxerRecord, Fighter, FighterFilters, Fight } from "./types";
import { applyFilters, dedupeFighters, slugify } from "./utils";

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

/** Compte le palmarès depuis les combats de carrière, du point de vue du
 *  boxeur (les KO ne comptent que sur les victoires). */
function recordFromFights(name: string, fights: Fight[]): BoxerRecord {
  const rec: BoxerRecord = { wins: 0, losses: 0, draws: 0, ko: 0 };
  const slug = slugify(name);
  for (const f of fights) {
    const winnerIndex = f.outcome?.winnerIndex;
    const myIndex = f.fighters.findIndex((ref) => slugify(ref.name) === slug);
    if (myIndex === -1) continue; // combat où le boxeur n'est pas cité
    if (winnerIndex === undefined) {
      rec.draws += 1;
    } else if (winnerIndex === myIndex) {
      rec.wins += 1;
      if (/ko|tko|knockout|arr[êe]t/i.test(f.outcome?.method ?? "")) rec.ko += 1;
    } else {
      rec.losses += 1;
    }
  }
  return rec;
}

/** Dérive le palmarès depuis la carrière (archive pipeline + Wikipedia)
 *  quand aucune source n'a publié de record (0-0-0) — ex. Rico Verhoeven,
 *  dont les combats existent dans wikipedia-careers.json mais pas dans
 *  wikipedia-records.json. La dérivation ne touche jamais un record réel. */
async function deriveRecord(fighter: Fighter): Promise<Fighter> {
  const { wins, losses, draws } = fighter.record;
  if (wins + losses + draws > 0) return fighter;
  const { fights } = await getCarriere(fighter.slug);
  if (fights.length === 0) return fighter;
  const record = recordFromFights(fighter.name, fights);
  if (record.wins + record.losses + record.draws === 0) return fighter;
  const source = fighter.source ? `${fighter.source} + carrière` : "carrière";
  return { ...fighter, record, source };
}

export async function getBoxeur(slug: string) {
  const { fighter, source } = await router.getFighter(slug);
  if (!fighter) return { fighter: null, source };
  const derived = await deriveRecord(fighter);
  return { fighter: derived, source: derived.source ?? source };
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
