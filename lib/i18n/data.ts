import type { Locale } from "@/i18n/routing";

/**
 * Dictionnaires de traduction pour les données métier stockées en français
 * canonique (catégories de poids, pays, méthodes de décision, titres).
 * Les données restent en FR dans le pipeline ; seule l'UI traduit.
 */

/** Normalise une chaîne locale en `Locale` (fallback fr). */
export function toLocale(value: string | undefined | null): Locale {
  return value === "en" ? "en" : "fr";
}

/* ── Catégories de poids ──────────────────────────────────────────── */

const WEIGHT_CLASSES_MAP: Record<string, Record<Locale, string>> = {
  "Poids lourds": { fr: "Poids lourds", en: "Heavyweight" },
  "Poids lourds-légers": { fr: "Poids lourds-légers", en: "Cruiserweight" },
  "Poids mi-lourds": { fr: "Poids mi-lourds", en: "Light Heavyweight" },
  "Poids super-moyens": { fr: "Poids super-moyens", en: "Super Middleweight" },
  "Poids moyens": { fr: "Poids moyens", en: "Middleweight" },
  "Poids super-welters": { fr: "Poids super-welters", en: "Super Welterweight" },
  "Poids welters": { fr: "Poids welters", en: "Welterweight" },
  "Poids super-légers": { fr: "Poids super-légers", en: "Super Lightweight" },
  "Poids légers": { fr: "Poids légers", en: "Lightweight" },
  "Poids super-plumes": { fr: "Poids super-plumes", en: "Super Featherweight" },
  "Poids plumes": { fr: "Poids plumes", en: "Featherweight" },
  "Poids super-coqs": { fr: "Poids super-coqs", en: "Super Bantamweight" },
  "Poids coqs": { fr: "Poids coqs", en: "Bantamweight" },
  "Poids super-mouches": { fr: "Poids super-mouches", en: "Super Flyweight" },
  "Poids mouches": { fr: "Poids mouches", en: "Flyweight" },
  "Poids mi-mouches": { fr: "Poids mi-mouches", en: "Light Flyweight" },
};

/** Traduit une catégorie de poids (clé FR canonique → locale). */
export function weightClassLabel(weightClass: string, locale: Locale): string {
  return WEIGHT_CLASSES_MAP[weightClass]?.[locale] ?? weightClass;
}

/* ── Pays ─────────────────────────────────────────────────────────── */

const COUNTRY_ALIASES: Record<string, Record<Locale, string>> = {
  "United States": { fr: "États-Unis", en: "United States" },
  USA: { fr: "États-Unis", en: "United States" },
  "États-Unis": { fr: "États-Unis", en: "United States" },
  "United Kingdom": { fr: "Royaume-Uni", en: "United Kingdom" },
  UK: { fr: "Royaume-Uni", en: "United Kingdom" },
  "Royaume-Uni": { fr: "Royaume-Uni", en: "United Kingdom" },
  England: { fr: "Angleterre", en: "England" },
  Scotland: { fr: "Écosse", en: "Scotland" },
  Wales: { fr: "Pays de Galles", en: "Wales" },
  Ukraine: { fr: "Ukraine", en: "Ukraine" },
  Mexique: { fr: "Mexique", en: "Mexico" },
  Mexico: { fr: "Mexique", en: "Mexico" },
  France: { fr: "France", en: "France" },
  Japon: { fr: "Japon", en: "Japan" },
  Japan: { fr: "Japon", en: "Japan" },
  Ouzbékistan: { fr: "Ouzbékistan", en: "Uzbekistan" },
  Uzbekistan: { fr: "Ouzbékistan", en: "Uzbekistan" },
  Kazakhstan: { fr: "Kazakhstan", en: "Kazakhstan" },
  Cuba: { fr: "Cuba", en: "Cuba" },
  Cameroun: { fr: "Cameroun", en: "Cameroon" },
  Cameroon: { fr: "Cameroun", en: "Cameroon" },
  "République dominicaine": { fr: "République dominicaine", en: "Dominican Republic" },
  "Dominican Republic": { fr: "République dominicaine", en: "Dominican Republic" },
  "Puerto Rico": { fr: "Porto Rico", en: "Puerto Rico" },
  "Porto Rico": { fr: "Porto Rico", en: "Puerto Rico" },
  Australie: { fr: "Australie", en: "Australia" },
  Australia: { fr: "Australie", en: "Australia" },
  Canada: { fr: "Canada", en: "Canada" },
  Russie: { fr: "Russie", en: "Russia" },
  Russia: { fr: "Russie", en: "Russia" },
  Allemagne: { fr: "Allemagne", en: "Germany" },
  Germany: { fr: "Allemagne", en: "Germany" },
  Brésil: { fr: "Brésil", en: "Brazil" },
  Brazil: { fr: "Brésil", en: "Brazil" },
  Argentine: { fr: "Argentine", en: "Argentina" },
  Argentina: { fr: "Argentine", en: "Argentina" },
  Irlande: { fr: "Irlande", en: "Ireland" },
  Ireland: { fr: "Irlande", en: "Ireland" },
  Pologne: { fr: "Pologne", en: "Poland" },
  Poland: { fr: "Pologne", en: "Poland" },
  Suède: { fr: "Suède", en: "Sweden" },
  Sweden: { fr: "Suède", en: "Sweden" },
  Chine: { fr: "Chine", en: "China" },
  China: { fr: "Chine", en: "China" },
  Thaïlande: { fr: "Thaïlande", en: "Thailand" },
  Thailand: { fr: "Thaïlande", en: "Thailand" },
  Inde: { fr: "Inde", en: "India" },
  India: { fr: "Inde", en: "India" },
  "Afrique du Sud": { fr: "Afrique du Sud", en: "South Africa" },
  "South Africa": { fr: "Afrique du Sud", en: "South Africa" },
  Nigéria: { fr: "Nigéria", en: "Nigeria" },
  Nigeria: { fr: "Nigéria", en: "Nigeria" },
  Ghana: { fr: "Ghana", en: "Ghana" },
  Sénégal: { fr: "Sénégal", en: "Senegal" },
  Senegal: { fr: "Sénégal", en: "Senegal" },
  Égypte: { fr: "Égypte", en: "Egypt" },
  Egypt: { fr: "Égypte", en: "Egypt" },
  Belgique: { fr: "Belgique", en: "Belgium" },
  Belgium: { fr: "Belgique", en: "Belgium" },
  Suisse: { fr: "Suisse", en: "Switzerland" },
  Switzerland: { fr: "Suisse", en: "Switzerland" },
  Espagne: { fr: "Espagne", en: "Spain" },
  Spain: { fr: "Espagne", en: "Spain" },
  Italie: { fr: "Italie", en: "Italy" },
  Italy: { fr: "Italie", en: "Italy" },
  Turquie: { fr: "Turquie", en: "Turkey" },
  Turkey: { fr: "Turquie", en: "Turkey" },
  "Arabie saoudite": { fr: "Arabie saoudite", en: "Saudi Arabia" },
  "Saudi Arabia": { fr: "Arabie saoudite", en: "Saudi Arabia" },
  Émirats: { fr: "Émirats", en: "UAE" },
  UAE: { fr: "Émirats", en: "UAE" },
  "Pays-Bas": { fr: "Pays-Bas", en: "Netherlands" },
  Netherlands: { fr: "Pays-Bas", en: "Netherlands" },
  Danemark: { fr: "Danemark", en: "Denmark" },
  Denmark: { fr: "Danemark", en: "Denmark" },
  Norvège: { fr: "Norvège", en: "Norway" },
  Norway: { fr: "Norvège", en: "Norway" },
  Finlande: { fr: "Finlande", en: "Finland" },
  Finland: { fr: "Finlande", en: "Finland" },
};

const NORM_RE = /[\u0300-\u036f]/g;

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(NORM_RE, "");
}

/** Traduit un nom de pays (FR ou EN) vers la locale cible. */
export function countryLabel(country: string, locale: Locale): string {
  const key = Object.keys(COUNTRY_ALIASES).find(
    (k) => norm(k) === norm(country)
  );
  return key ? COUNTRY_ALIASES[key]![locale] : country;
}

/* ── Méthodes de décision ─────────────────────────────────────────── */

const METHOD_LABELS: Record<string, Record<Locale, string>> = {
  Nul: { fr: "Nul", en: "Draw" },
  NC: { fr: "NC", en: "NC" },
  DQ: { fr: "DQ", en: "DQ" },
  RTD: { fr: "RTD", en: "RTD" },
  TD: { fr: "TD", en: "TD" },
};

/** Traduit une méthode de décision (Nul → Draw, les sigles restent). */
export function methodLabel(method: string, locale: Locale): string {
  return METHOD_LABELS[method]?.[locale] ?? method;
}

/* ── Titres (best-effort) ─────────────────────────────────────────── */

const TITLE_FR_TO_EN: Array<[string, string]> = [
  ["poids lourds-légers", "cruiserweight"],
  ["poids super-moyens", "super middleweight"],
  ["poids super-welters", "super welterweight"],
  ["poids super-légers", "super lightweight"],
  ["poids super-plumes", "super featherweight"],
  ["poids super-coqs", "super bantamweight"],
  ["poids super-mouches", "super flyweight"],
  ["poids mi-lourds", "light heavyweight"],
  ["poids mi-mouches", "light flyweight"],
  ["poids moyens", "middleweight"],
  ["poids lourds", "heavyweight"],
  ["poids welters", "welterweight"],
  ["poids légers", "lightweight"],
  ["poids plumes", "featherweight"],
  ["poids coqs", "bantamweight"],
  ["poids mouches", "flyweight"],
  ["champion du monde", "world champion"],
  ["champion du monde incontesté", "undisputed world champion"],
  ["incontesté", "undisputed"],
  ["unifié", "unified"],
  ["régulier", "regular"],
  ["ceinture", "belt"],
  ["titre", "title"],
  ["champion", "champion"],
];

const TITLE_EN_TO_FR: Array<[string, string]> = [
  ["light heavyweight", "poids mi-lourds"],
  ["super middleweight", "poids super-moyens"],
  ["super welterweight", "poids super-welters"],
  ["super lightweight", "poids super-légers"],
  ["super featherweight", "poids super-plumes"],
  ["super bantamweight", "poids super-coqs"],
  ["super flyweight", "poids super-mouches"],
  ["light flyweight", "poids mi-mouches"],
  ["cruiserweight", "poids lourds-légers"],
  ["middleweight", "poids moyens"],
  ["heavyweight", "poids lourds"],
  ["welterweight", "poids welters"],
  ["lightweight", "poids légers"],
  ["featherweight", "poids plumes"],
  ["bantamweight", "poids coqs"],
  ["flyweight", "poids mouches"],
  ["undisputed world champion", "champion du monde incontesté"],
  ["world champion", "champion du monde"],
  ["undisputed", "incontesté"],
  ["unified", "unifié"],
  ["regular", "régulier"],
  ["belt", "ceinture"],
  ["title", "titre"],
  ["champion", "champion"],
];

/** Replacements triés des expressions les plus longues aux plus courtes. */
const TITLE_REPLACEMENTS: Record<Locale, Array<[string, string]>> = {
  fr: [...TITLE_EN_TO_FR].sort((a, b) => b[0].length - a[0].length),
  en: [...TITLE_FR_TO_EN].sort((a, b) => b[0].length - a[0].length),
};

/**
 * Traduction best-effort d'un titre de ceinture (« Ceinture WBC poids
 * lourds » → « WBC Heavyweight Belt »). Les sigles d'organisations et les
 * noms propres sont préservés ; le résultat est en minuscules pour les
 * mots traduits (l'UI applique `uppercase`).
 */
export function titleLabel(title: string, locale: Locale): string {
  if (locale === "fr") return title;
  let out = title;
  for (const [from, to] of TITLE_REPLACEMENTS[locale]) {
    out = out.replace(new RegExp(from, "gi"), to);
  }
  return out;
}