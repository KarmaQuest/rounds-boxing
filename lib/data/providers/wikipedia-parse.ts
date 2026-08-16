import type { BoxerRecord, Stance, WeightClass } from "../types";

/**
 * Parser d'infobox Wikipedia (wikitext) — format français « Infobox Boxeur »
 * et anglais « Infobox boxer ».
 *
 * Champs gérés (fr / en) :
 * - combats / total          → total de combats
 * - victoires / wins         → victoires
 * - KO / ko                  → victoires par KO
 * - défaites / losses        → défaites
 * - matchs nuls / draws      → nuls
 * - taille / height          → cm ({{taille|m=1.71}}, « 1.71 m », « 5 ft 8 in »)
 * - allonge / reach          → cm ({{taille|m=1.79}}, « 71 in », « 180 cm »)
 * - style / stance           → « Orthodoxe » / « Southpaw » / « Switch »
 * - catégorie / weight_class → catégorie de poids (fr normalisé)
 * - surnom / nickname        → surnom
 */

/** Retire <ref>…</ref>, balises et liens wiki d'une valeur brute. */
function cleanValue(value: string): string {
  return value
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, " ")
    .replace(/<ref[^>]*\/>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[\[[^|]*\|([^\]]*)\]\]/g, "$1")
    .replace(/\[\[([^\]]*)\]\]/g, "$1")
    .replace(/'{2,}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extrait la valeur brute d'un champ d'infobox (défensif). */
function fieldValue(infobox: string, ...names: string[]): string {
  for (const name of names) {
    // `| nom = valeur` — on s'arrête à la ligne suivante pour ne pas
    // déborder sur les autres champs. `[ \t]*` (pas `\s*`) : un retour à
    // la ligne après `=` ne doit PAS être avalé (sinon on capture le champ
    // suivant, ex. « | surnom = » vide suivi de « | nationalité = … »).
    const re = new RegExp(
      `(?:^|\\n)[ \\t]*\\|[ \\t]*${name}[ \\t]*=[ \\t]*([^\\n]*)`,
      "i"
    );
    const m = infobox.match(re);
    if (m?.[1] !== undefined) {
      let value = m[1];
      // valeur multi-ligne ({{plainlist|…}} en EN) : on étend la capture
      // jusqu'à la fermeture du template ou au champ suivant
      if (value.includes("{{")) {
        const rest = infobox.slice(m.index! + m[0].length);
        let depth = 1;
        const extra: string[] = [];
        for (const line of rest.split("\n")) {
          if (/^\s*\|/.test(line)) break; // champ suivant
          depth +=
            (line.match(/\{\{/g) ?? []).length -
            (line.match(/\}\}/g) ?? []).length;
          if (depth <= 0) break; // template refermé
          extra.push(line);
        }
        value = [value, ...extra].join("\n");
      }
      // champ à base de {{plainlist|…}} : on extrait les items (`* …`)
      // AVANT le nettoyage (qui aplatirait les retours à la ligne).
      // Pour la catégorie de poids, la liste va de la plus ancienne classe
      // à la plus récente → on garde le DERNIER item (la classe actuelle) ;
      // pour les autres champs (surnom…), le premier item.
      if (/\{\{\s*plainlist/i.test(value)) {
        const items: string[] = [];
        for (const line of value.split("\n")) {
          const item = line.match(/^\*\s*(.+)$/);
          if (item && item[1].trim()) items.push(item[1]);
        }
        if (items.length > 0) {
          const pick = names.some((n) => /weight|catégorie/i.test(n))
            ? items[items.length - 1]
            : items[0];
          return cleanValue(pick);
        }
      }
      return cleanValue(value);
    }
  }
  return "";
}

/**
 * Champ à base de {{plainlist|…}} (EN) : garde le PREMIER item (`* …`),
 * c'est la valeur principale (catégorie de poids, surnom).
 */
function firstPlainlistItem(value: string): string {
  if (!/\{\{\s*plainlist/i.test(value)) return value;
  for (const line of value.split("\n")) {
    const m = line.match(/^\*\s*(.+)$/);
    if (m && m[1].trim()) return cleanValue(m[1]);
  }
  return "";
}

/** Le champ est-il présent dans l'infobox (même avec une valeur vide) ? */
function fieldExists(infobox: string, ...names: string[]): boolean {
  for (const name of names) {
    const re = new RegExp(
      `(?:^|\\n)[ \\t]*\\|[ \\t]*${name}[ \\t]*=`,
      "i"
    );
    if (re.test(infobox)) return true;
  }
  return false;
}

function firstInt(infobox: string, ...names: string[]): number | null {
  const v = fieldValue(infobox, ...names);
  const m = v.match(/\d{1,4}/);
  return m ? Number(m[0]) : null;
}

/** « 1.71 m », « {{taille|m=1.71}} », « 178 cm », « 5 ft 8 in » → cm. */
export function heightToCm(value: string): number | null {
  if (!value) return null;
  // template {{taille|m=1.71}}
  let m = value.match(/\{\{\s*taille\s*\|\s*m\s*=\s*([\d.]+)/i);
  if (m) return Math.round(Number(m[1]) * 100);
  // mètres
  m = value.match(/([\d.]+)\s*m(?:etres|etre)?\b/i);
  if (m) return Math.round(Number(m[1]) * 100);
  // centimètres
  m = value.match(/(\d{3})\s*cm/i);
  if (m) return Number(m[1]);
  // template {{taille|pieds=5|pouces=8}}
  m = value.match(/\{\{\s*taille[^}]*?pieds\s*=\s*(\d+)[^}]*?pouces\s*=\s*(\d+)/i);
  if (m) return Math.round((Number(m[1]) * 12 + Number(m[2])) * 2.54);
  // pieds + pouces : « 5 ft 8 in », « 5 ft 8+1/2 in », « 5 ft 8 1/2 in »
  m = value.match(/(\d+)\s*ft\s*(\d+)\s*\+?\s*(\d+)?\s*\/\s*(\d+)?\s*in/i);
  if (m) {
    const feet = Number(m[1]);
    const inches = Number(m[2] ?? 0);
    const frac = m[3] && m[4] ? Number(m[3]) / Number(m[4]) : 0;
    return Math.round((feet * 12 + inches + frac) * 2.54);
  }
  m = value.match(/(\d+)\s*ft\s*(\d+)?\s*in/i);
  if (m) {
    return Math.round((Number(m[1]) * 12 + Number(m[2] ?? 0)) * 2.54);
  }
  // pouces + fraction sans pieds : « 68+1/2 in », « 71 in »
  m = value.match(/(\d+)\s*\+?\s*(\d+)?\s*\/\s*(\d+)?\s*in/i);
  if (m) {
    const inches = Number(m[1]);
    const frac = m[2] && m[3] ? Number(m[2]) / Number(m[3]) : 0;
    return Math.round((inches + frac) * 2.54);
  }
  m = value.match(/(\d+(?:\.\d+)?)\s*in\b/i);
  if (m) return Math.round(Number(m[1]) * 2.54);
  return null;
}

/**
 * « 71 in », « 68+1/2 in », « 5 ft 8 in », « 180 cm », « 1.79 m » → cm.
 * Mêmes formats que la taille (mêmes unités) — on délègue à heightToCm,
 * qui gère les fractions (« 68+1/2 in » → 68,5 po) et les pieds+pouces.
 */
export function reachToCm(value: string): number | null {
  return heightToCm(value);
}

/** Normalise la garde : fr (« Garde orthodoxe », « Gaucher », « Fausse patte ») et en. */
export function stanceNormalize(value: string): Stance | null {
  const v = value.toLowerCase();
  if (/southpaw|gaucher|fausse patte/.test(v)) return "Southpaw";
  if (/orthodox/.test(v)) return "Orthodoxe";
  if (/switch|ambidextre/.test(v)) return "Switch";
  return null;
}

const EN_TO_FR: Record<string, string> = {
  heavyweight: "Poids lourds",
  "cruiserweight": "Poids lourds-légers",
  "light heavyweight": "Poids mi-lourds",
  "super middleweight": "Poids super-moyens",
  middleweight: "Poids moyens",
  "light middleweight": "Poids super-welters",
  "super welterweight": "Poids super-welters",
  welterweight: "Poids welters",
  "light welterweight": "Poids super-légers",
  "super lightweight": "Poids super-légers",
  lightweight: "Poids légers",
  "super featherweight": "Poids super-plumes",
  "junior lightweight": "Poids super-plumes",
  featherweight: "Poids plumes",
  "super bantamweight": "Poids super-coqs",
  bantamweight: "Poids coqs",
  "super flyweight": "Poids super-mouches",
  flyweight: "Poids mouches",
  "light flyweight": "Poids mi-mouches",
};

/** Normalise la catégorie (fr direct, en traduit). */
export function weightClassNormalize(value: string): WeightClass | null {
  if (!value) return null;
  const v = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\[\[|\]\]|\{\{|\}\}/g, "")
    // « Light-heavyweight » (tiret EN) → « light heavyweight »
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // fr : « Poids lourds », « poids moyens »…
  if (v.startsWith("poids ")) {
    const map: Record<string, string> = {
      "poids lourds-legers": "Poids lourds-légers",
      "poids mi-lourds": "Poids mi-lourds",
      "poids super-moyens": "Poids super-moyens",
      "poids moyens": "Poids moyens",
      "poids super-welters": "Poids super-welters",
      "poids welters": "Poids welters",
      "poids super-legers": "Poids super-légers",
      "poids legers": "Poids légers",
      "poids super-plumes": "Poids super-plumes",
      "poids plumes": "Poids plumes",
      "poids super-coqs": "Poids super-coqs",
      "poids coqs": "Poids coqs",
      "poids super-mouches": "Poids super-mouches",
      "poids mouches": "Poids mouches",
      "poids mi-mouches": "Poids mi-mouches",
      "poids lourds": "Poids lourds",
    };
    const hit = map[v];
    if (hit) return hit as WeightClass;
    return null;
  }
  // en : traduit vers le terme français
  return (EN_TO_FR[v] as WeightClass) ?? null;
}

/** Parse le record complet. Les champs manquants restent undefined, avec des
 *  inférences prudentes : champ vide = 0 (convention fr « invaincu »), et
 *  total présent = défaites déduites (infobox abrégée « total=3, wins=3 »). */
export function parseRecord(infobox: string): Partial<BoxerRecord> {
  const wins = firstInt(infobox, "victoires", "wins");
  const losses = firstInt(infobox, "défaites", "losses");
  const draws = firstInt(infobox, "matchs nuls", "draws");
  const ko = firstInt(infobox, "KO", "ko");
  const total = firstInt(infobox, "combats", "total");

  let lossesV = losses;
  if (lossesV === null && wins !== null && fieldExists(infobox, "défaites", "losses")) {
    // Convention des infobox fr : « | défaites = » vide = boxeur invaincu → 0
    lossesV = 0;
  } else if (
    lossesV === null &&
    wins !== null &&
    total !== null &&
    total >= wins
  ) {
    // infobox abrégée sans champ défaites : total − victoires − nuls
    lossesV = Math.max(0, total - wins - (draws ?? 0));
  }

  let drawsV = draws;
  if (drawsV === null && wins !== null && fieldExists(infobox, "matchs nuls", "draws")) {
    drawsV = 0;
  } else if (drawsV === null && wins !== null && lossesV !== null) {
    // record complet (V+D) sans champ nuls → le boxeur n'a pas de nuls
    // (l'infobox les listerait sinon) — ex. infobox EN sans champ draws
    drawsV = 0;
  }

  const record: Partial<BoxerRecord> = {};
  if (wins !== null) record.wins = wins;
  if (lossesV !== null) record.losses = lossesV;
  if (drawsV !== null) record.draws = drawsV;
  if (ko !== null) record.ko = ko;
  return record;
}

/**
 * Parse une infobox de boxeur → données exploitables pour une fiche.
 * Retourne null si l'infobox n'existe pas ou si aucun record n'est lisible
 * (la page n'est pas un boxeur, ou mal structurée).
 */
export function parseBoxerInfobox(wikitext: string): {
  record: Partial<BoxerRecord>;
  heightCm?: number;
  reachCm?: number;
  stance?: Stance;
  weightClass?: WeightClass;
  nickname?: string;
} | null {
  if (!wikitext) return null;
  const start = wikitext.indexOf("{{Infobox");
  if (start === -1) return null;
  const infobox = wikitext.slice(start);

  const record = parseRecord(infobox);
  if (record.wins === undefined && record.losses === undefined) {
    return null; // pas de données de boxeur lisibles
  }

  const heightCm = heightToCm(fieldValue(infobox, "taille", "height"));
  const reachCm = reachToCm(fieldValue(infobox, "allonge", "reach"));
  const stance = stanceNormalize(fieldValue(infobox, "style", "stance"));
  const weightClass = weightClassNormalize(
    firstPlainlistItem(fieldValue(infobox, "catégorie", "weight_class", "weight"))
  );
  const nickname =
    firstPlainlistItem(fieldValue(infobox, "surnom", "nickname")).replace(
      /^['"]+|['"]+$/g,
      ""
    ) || undefined;

  return {
    record,
    ...(heightCm ? { heightCm } : {}),
    ...(reachCm ? { reachCm } : {}),
    ...(stance ? { stance } : {}),
    ...(weightClass ? { weightClass } : {}),
    ...(nickname ? { nickname } : {}),
  };
}
