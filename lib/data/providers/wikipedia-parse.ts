import type { BoxerRecord, Stance, WeightClass } from "../types";
import type { WikipediaBout } from "./wikipedia-types";

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

/* ═══════════════════════════════════════════════════════════════════
 *  Palmarès professionnel complet — tableau « Professional boxing record »
 *  (en) / « Palmarès professionnel » (fr) des articles de boxeurs.
 *  Colonnes : No. | Result | Record | Opponent | Type | Round, time |
 *  Date | Location | Notes — du combat le plus récent au plus ancien.
 * ═══════════════════════════════════════════════════════════════════ */

/** Retire balises, refs, templates, liens wiki et commentaires d'une cellule. */
function cleanCell(raw: string): string {
  return raw
    .replace(/<!--[\s\S]*?-->/g, " ")
    // attributs de cellule (style/align/class…) : `style="…"|` et `align=left|`
    .replace(/\b(?:style|align|valign|class|rowspan|colspan|bgcolor)\s*=\s*"[^"]*"\s*\|/gi, " ")
    .replace(/\b(?:align|valign)\s*=\s*\w+\s*\|/gi, " ")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, " ")
    .replace(/<ref[^>]*\/>/gi, " ")
    .replace(/<br\s*\/?>/gi, " · ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\{\{\s*small\s*\|([\s\S]*?)\}\}/gi, "$1") // {{small|…}} → contenu
    .replace(/\{\{\s*abbr\s*\|([^|]*)\|([^}]*)\}\}/gi, "$2") // {{abbr|UD|Unanimous}} → label
    .replace(/\{\{\s*(yes2|no2|draw|n\/a|maybe|dunno|sd)\s*\}\}/gi, "") // fond de cellule
    .replace(/\{\{[^}]*\}\}/g, " ")
    .replace(/\[\[[^|\]]*\|([^\]]*)\]\]/g, "$1") // lien wiki → libellé
    .replace(/\[\[([^\]]*)\]\]/g, "$1")
    .replace(/'{2,}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Décode le résultat (en/fr) → valeur canonique, null si illisible. */
export function normalizeBoutResult(raw: string): WikipediaBout["result"] | null {
  const s = (raw ?? "").toLowerCase();
  if (/no contest|sans d[cé]cision/.test(s)) return "NC";
  if (/^nc$|^n\.c\.?$/.test(s.trim())) return "NC";
  if (/win|victoire|vaincu|gagn/.test(s)) return "Win";
  if (/loss|d[cé]faite|perdu/.test(s)) return "Loss";
  if (/draw|nul|égalit|egalit/.test(s)) return "Draw";
  return null;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  january: 1, february: 2, march: 3, april: 4, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  janvier: 1, février: 1, fevrier: 1, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7,
  août: 8, aout: 8, septembre: 9, octobre: 10, novembre: 11, décembre: 12, decembre: 12,
};

/** « 23 May 2026 », « 19 Jul 2025 », « Sep 13, 2025 », « 23 mai 2026 »
 *  → ISO yyyy-mm-dd. Supporte jour-mois-année (en/fr) et mois-jour-année
 *  (variante en « Sep 13, 2025 »). */
export function parseBoutDate(raw: string): string | null {
  const toIso = (day: number, month: number, year: number): string | null => {
    if (day < 1 || day > 31 || year < 1950 || year > 2100) return null;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };
  const s = raw ?? "";
  // jour mois année : « 23 May 2026 », « 23 mai 2026 »
  let m = s.match(/(\d{1,2})\s+([A-Za-zÀ-ÿ]{3,})\s+(\d{4})/);
  if (m) {
    const month = MONTHS[m[2]!.toLowerCase()];
    if (month) return toIso(Number(m[1]), month, Number(m[3]));
  }
  // mois jour, année : « Sep 13, 2025 »
  m = s.match(/([A-Za-zÀ-ÿ]{3,})\s+(\d{1,2}),?\s+(\d{4})/);
  if (m) {
    const month = MONTHS[m[1]!.toLowerCase()];
    if (month) return toIso(Number(m[2]), month, Number(m[3]));
  }
  return null;
}

/** « 11 (12), 2:59 », « 12 » → round d'arrêt (ou undefined aux points). */
export function parseBoutRound(raw: string): number | undefined {
  const m = (raw ?? "").match(/\b(\d{1,2})\b/);
  if (!m) return undefined;
  const n = Number(m[1]);
  return n >= 1 && n <= 30 ? n : undefined;
}

/** Ceintures citées dans les notes → titre du combat (« Titre WBA, WBC… »). */
export function beltsFromNotes(notes?: string): string | undefined {
  if (!notes) return undefined;
  const hits = notes.match(/\b(WBA|WBC|IBF|WBO|IBO|The Ring)\b/gi);
  if (!hits) return undefined;
  const uniq = [...new Set(hits.map((h) => (h.toLowerCase() === "the ring" ? "The Ring" : h.toUpperCase())))];
  return `Titre ${uniq.join(", ")}`;
}

/** Découpe le wikitable d'une section en lignes de cellules nettoyées. */
export function parseCareerTable(section: string): string[][] {
  const rows: string[][] = [];
  const start = section.indexOf("{|");
  if (start === -1) return rows;
  const end = section.indexOf("|}", start);
  const body = end === -1 ? section.slice(start) : section.slice(start, end);
  for (const block of body.split(/^\|-/m).slice(1)) {
    const cells: string[] = [];
    for (const rawLine of block.split("\n")) {
      const line = rawLine.trimEnd();
      if (!line.trim()) continue;
      const m = line.match(/^\|\|?(.*)$/);
      if (m) {
        for (const part of m[1]!.split("||")) {
          const clean = cleanCell(part);
          cells.push(clean);
        }
      } else if (cells.length > 0) {
        // ligne de continuation (cellule multi-lignes) → on l'ajoute à la dernière
        const clean = cleanCell(line);
        if (clean) {
          cells[cells.length - 1] += cells[cells.length - 1] ? " " + clean : clean;
        }
      }
    }
    if (cells.length >= 7) rows.push(cells);
  }
  return rows;
}

/**
 * Extrait le palmarès professionnel complet d'un article de boxeur
 * (tableau « Professional boxing record » / « Palmarès professionnel »),
 * du combat le plus récent au plus ancien. Retourne [] si l'article n'a
 * pas de tableau exploitable.
 */
export function parseBoxerCareer(wikitext: string): WikipediaBout[] {
  if (!wikitext) return [];
  const header = wikitext.match(
    /==\s*(?:Professional boxing record|Palmar[èe]s professionnel(?: de boxe)?|Palmar[èe]s)\s*==/i
  );
  if (!header) return [];
  const rest = wikitext.slice(header.index! + header[0].length);
  const end = rest.search(/^==+\s*[^=]/m); // prochaine section
  const section = end === -1 ? rest : rest.slice(0, end);

  const bouts: WikipediaBout[] = [];
  for (const cells of parseCareerTable(section)) {
    const result = normalizeBoutResult(cells[1] ?? "");
    const opponent = (cells[3] ?? "").trim();
    const date = parseBoutDate(cells[6] ?? "");
    if (!result || !opponent || !date) continue;

    const type = (cells[4] ?? "").trim() || undefined;
    const round = parseBoutRound(cells[5] ?? "");
    const location = cells.length >= 8 ? (cells[7] ?? "").trim() || undefined : undefined;
    const notes = cells.length >= 9 ? (cells[8] ?? "").trim() || undefined : undefined;

    bouts.push({
      result,
      opponent,
      ...(type ? { type } : {}),
      ...(round !== undefined ? { round } : {}),
      date,
      ...(location ? { location } : {}),
      ...(beltsFromNotes(notes) ? { title: beltsFromNotes(notes) } : {}),
      ...(notes ? { notes } : {}),
    });
  }
  return bouts;
}
