import type { BoxerRecord, Fight, Fighter, FighterFilters } from "./types";

/** Génère un slug stable à partir d'un nom. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Dictionnaire pays → drapeau (couverture courante, fallback globe). */
const FLAGS: Record<string, string> = {
  "United States": "US",
  "USA": "US",
  "États-Unis": "US",
  "United Kingdom": "GB",
  "UK": "GB",
  "Royaume-Uni": "GB",
  "England": "GB",
  "Ukraine": "UA",
  "Mexique": "MX",
  "Mexico": "MX",
  "France": "FR",
  "Japon": "JP",
  "Japan": "JP",
  "Ouzbékistan": "UZ",
  "Uzbekistan": "UZ",
  "Kazakhstan": "KZ",
  "Cuba": "CU",
  "Cameroun": "CM",
  "Cameroon": "CM",
  "République dominicaine": "DO",
  "Dominican Republic": "DO",
  "Puerto Rico": "PR",
  "Porto Rico": "PR",
  "Australie": "AU",
  "Australia": "AU",
  "Canada": "CA",
  "Russie": "RU",
  "Russia": "RU",
  "Allemagne": "DE",
  "Germany": "DE",
  "Brésil": "BR",
  "Brazil": "BR",
  "Argentine": "AR",
  "Argentina": "AR",
  "Irlande": "IE",
  "Ireland": "IE",
  "Pologne": "PL",
  "Poland": "PL",
  "Suède": "SE",
  "Sweden": "SE",
  "Chine": "CN",
  "China": "CN",
  "Thaïlande": "TH",
  "Thailand": "TH",
  "Inde": "IN",
  "India": "IN",
  "Afrique du Sud": "ZA",
  "South Africa": "ZA",
  "Nigéria": "NG",
  "Nigeria": "NG",
  "Ghana": "GH",
  "Sénégal": "SN",
  "Senegal": "SN",
  "Égypte": "EG",
  "Egypt": "EG",
  "Belgique": "BE",
  "Belgium": "BE",
  "Suisse": "CH",
  "Switzerland": "CH",
  "Espagne": "ES",
  "Spain": "ES",
  "Italie": "IT",
  "Italy": "IT",
  "Turquie": "TR",
  "Turkey": "TR",
  "Arabie saoudite": "SA",
  "Saudi Arabia": "SA",
  "Émirats": "AE",
  "UAE": "AE",
};

/** Convertit un code pays ISO en emoji drapeau (fallback globe). */
function flagEmoji(iso: string): string {
  const cp = iso.toUpperCase().replace(/[^A-Z]/g, "");
  if (cp.length !== 2) return "🌍";
  return String.fromCodePoint(0x1f1e6 + cp.charCodeAt(0) - 65, 0x1f1e6 + cp.charCodeAt(1) - 65);
}

export function flagForCountry(country?: string): string {
  if (!country) return "🌍";
  const key = Object.keys(FLAGS).find(
    (k) => k.toLowerCase() === country.toLowerCase()
  );
  return key ? flagEmoji(FLAGS[key]!) : "🌍";
}



/** Pourcentage de victoires par KO (0-100). */
export function koPct(record: BoxerRecord): number {
  const total = record.wins + record.losses + record.draws;
  if (total === 0) return 0;
  return Math.round((record.ko / total) * 100);
}

export function totalFights(record: BoxerRecord): number {
  return record.wins + record.losses + record.draws;
}

export function recordLabel(record: BoxerRecord): string {
  return `${record.wins}-${record.losses}-${record.draws}`;
}

/** Recherche texte simple (insensible aux accents). */
export function matchesQuery(fighter: Fighter, q: string): boolean {
  if (!q) return true;
  const needle = q
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const haystack = [fighter.name, fighter.nickname ?? "", fighter.country]
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return haystack.includes(needle);
}

/** Normalise une chaîne : minuscules + sans accents. */
function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Distance de Levenshtein (tolère les typos — TASKS 1.3 recherche floue). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** Tolérance de fautes pour un mot : 1 faute minimum, ~25 % au-delà. */
function tolerance(token: string): number {
  return Math.max(1, Math.floor(token.length / 4));
}

/**
 * Score flou d'une requête contre un texte : plus petit = meilleur,
 * Infinity = pas de correspondance. Chaque mot de la requête doit matcher
 * un token du texte (inclusion ou distance de Levenshtein ≤ tolérance).
 */
export function fuzzyScore(query: string, text: string): number {
  const q = normalize(query.trim());
  const t = normalize(text);
  if (!q) return 0;
  const qTokens = q.split(/\s+/);
  const tTokens = t.split(/\s+/);
  let total = 0;
  for (const qt of qTokens) {
    let best = Infinity;
    for (const tt of tTokens) {
      if (tt.includes(qt)) {
        best = 0;
        break;
      }
      best = Math.min(best, levenshtein(qt, tt));
    }
    if (best === Infinity || best > tolerance(qt)) return Infinity;
    total += best;
  }
  return total;
}

/** « usyk » ET « uzyk » trouvent Oleksandr Usyk (TASKS 1.3). */
export function fuzzyMatch(query: string, text: string): boolean {
  return fuzzyScore(query, text) !== Infinity;
}

/** Top suggestions pour l'autocomplete (recherche floue). */
export function fuzzySuggest(
  fighters: Fighter[],
  query: string,
  limit = 5
): Fighter[] {
  if (!query.trim()) return [];
  return fighters
    .map((f) => ({
      f,
      score: fuzzyScore(query, `${f.name} ${f.nickname ?? ""} ${f.country}`),
    }))
    .filter((x) => x.score !== Infinity)
    .sort((a, b) => a.score - b.score || a.f.name.localeCompare(b.f.name))
    .slice(0, limit)
    .map((x) => x.f);
}

/**
 * Score d'importance d'un combat — les grosses affiches passent en tête
 * (TASKS 1.4 : titre en jeu, boxeurs connus, cotes serrées, gros marchés).
 */
export function fightImportance(fight: Fight): number {
  let score = 0;
  const title = (fight.title ?? "").toLowerCase();
  if (/incontest|superfight|championnat|ceinture|unifi/.test(title)) score += 3;
  if (fight.title) score += 1;
  const [a, b] = fight.fighters;
  const aWins = a.record?.wins ?? 0;
  const bWins = b.record?.wins ?? 0;
  if (aWins > 0 && bWins > 0 && aWins + bWins >= 40) score += 2;
  if (fight.odds) {
    const [oa, ob] = fight.odds;
    if (Math.abs(oa - ob) < 0.4) score += 2; // cotes serrées
  }
  if (/riyad|las vegas/i.test(fight.location ?? "")) score += 1;
  return score;
}

/** Filtre + tri d'une liste de boxeurs. */
export function applyFilters(fighters: Fighter[], filters: FighterFilters): Fighter[] {
  let out = fighters.filter((f) => {
    if (!fuzzyMatch(filters.q ?? "", `${f.name} ${f.nickname ?? ""} ${f.country}`))
      return false;
    if (filters.weightClass && f.weightClass !== filters.weightClass) return false;
    if (filters.country && f.country.toLowerCase() !== filters.country.toLowerCase())
      return false;
    if (filters.minWins && f.record.wins < filters.minWins) return false;
    if (filters.minKoPct && koPct(f.record) < filters.minKoPct) return false;
    return true;
  });

  switch (filters.sort ?? "rank") {
    case "name":
      out = [...out].sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "wins":
      out = [...out].sort((a, b) => b.record.wins - a.record.wins);
      break;
    case "koPct":
      out = [...out].sort((a, b) => koPct(b.record) - koPct(a.record));
      break;
    case "age":
      out = [...out].sort((a, b) => a.age - b.age);
      break;
    case "height":
      out = [...out].sort((a, b) => b.heightCm - a.heightCm);
      break;
    default: // rank
      out = [...out].sort(
        (a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity)
      );
  }

  // pagination (TASKS 2.1) : offset + limite
  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? out.length;
  if (limit > 0) out = out.slice(offset, offset + limit);
  return out;
}

/** Retire les doublons par slug (un boxeur = une entrée). */
export function dedupeFighters(fighters: Fighter[]): Fighter[] {
  const seen = new Set<string>();
  return fighters.filter((f) => {
    if (seen.has(f.slug)) return false;
    seen.add(f.slug);
    return true;
  });
}
