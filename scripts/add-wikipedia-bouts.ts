// Génère le dataset des carrières complètes Wikipedia (wikipedia-careers.json).
//
// Usage :  npx tsx scripts/add-wikipedia-bouts.ts        (~15-25 min)
//          npx tsx scripts/add-wikipedia-bouts.ts --all  (tout re-parser)
//
// Pour CHAQUE boxeur ayant un ID Wikidata (bigballs.json + merged.json, déjà
// sur disque — ~12 000 boxeurs), on résout le titre Wikipedia, on récupère le
// wikitext complet de l'article (EN, secours FR), on parse le tableau
// « Professional boxing record », et on écrit { slug: { name, bouts } } dans
// `lib/data/providers/wikipedia-careers.json`.
//
// Le script est idempotent : les slugs ayant déjà des bouts sont sautés
// (sauf `--all`). Les boxeurs sans article exploitable n'apparaissent pas.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseBoxerCareer } from "../lib/data/providers/wikipedia-parse.ts";
import type { WikipediaBout } from "../lib/data/providers/wikipedia-types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(
  __dirname,
  "..",
  "lib",
  "data",
  "providers",
  "wikipedia-careers.json"
);

const UA =
  "ROUNDS-Boxing/0.1 (https://rounds.app - add wikipedia career bouts, contact: dev@rounds.app)";
const BATCH = 50; // titres par requête (max API)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface ApiEnvelope {
  query?: {
    pages?: Array<{
      title?: string;
      revisions?: Array<{ slots?: { main?: { content?: string } } }>;
    }>;
  };
  entities?: Record<string, { sitelinks?: Record<string, { title?: string }> }>;
  error?: unknown;
}

async function apiFetch(url: string): Promise<ApiEnvelope | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": UA, accept: "application/json" },
      });
      if (res.status === 429) {
        const wait = Number(res.headers.get("retry-after") ?? 5) * 1000;
        console.log(`  429 → pause ${Math.round(wait / 1000)}s`);
        await sleep(wait);
        continue;
      }
      return res.ok ? ((await res.json()) as ApiEnvelope) : null;
    } catch {
      if (attempt === 3) return null;
      await sleep(1500 * attempt);
    }
  }
  return null;
}

interface CareersEntry {
  name: string;
  bouts?: WikipediaBout[];
}

/** Charge un fichier JSON array du pipeline, [] si absent. */
function loadArray(file: string): Array<Record<string, unknown>> {
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as Array<Record<string, unknown>>;
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

/** Slug → ID Wikidata, depuis bigballs.json + merged.json (déjà sur disque). */
function loadWikidataBySlug(): Map<string, string> {
  const root = join(__dirname, "..", "public", "data", "boxers");
  const out = new Map<string, string>();
  for (const file of ["bigballs.json", "merged.json"]) {
    for (const b of loadArray(join(root, file))) {
      const slug = b?.slug as string | undefined;
      const qid = b?.wikidata_id as string | undefined;
      if (slug && qid && !out.has(slug)) out.set(slug, qid);
    }
  }
  return out;
}

/** Slug → nom d'affichage (le `name` du dataset doit être un vrai nom,
 *  pas le slug — la page filtre les combats par nom du boxeur). */
function loadNamesBySlug(): Map<string, string> {
  const root = join(__dirname, "..", "public", "data", "boxers");
  const out = new Map<string, string>();
  for (const file of ["bigballs.json", "merged.json"]) {
    for (const b of loadArray(join(root, file))) {
      const slug = b?.slug as string | undefined;
      const name = b?.name as string | undefined;
      if (slug && name && !out.has(slug)) out.set(slug, name);
    }
  }
  return out;
}

async function main() {
  const existing = JSON.parse(readFileSync(OUT, "utf8")) as Record<string, CareersEntry>;
  const force = process.argv.includes("--all");
  console.log(
    `Dataset existant : ${Object.keys(existing).length} boxeurs avec carrière`
  );

  const byQid = loadWikidataBySlug();
  const names = loadNamesBySlug();
  console.log(`Candidats avec ID Wikidata : ${byQid.size}`);

  const todo = [...byQid.entries()].filter(
    ([slug]) => force || !existing[slug]?.bouts?.length
  );
  console.log(`  à traiter : ${todo.length}`);

  // 1. résolution des titres (EN prioritaire) depuis les IDs Wikidata
  const titles = new Map<string, { en?: string; fr?: string }>();
  const qids = [...new Set(todo.map(([, q]) => q))];
  for (let i = 0; i < qids.length; i += BATCH) {
    const chunk = qids.slice(i, i + BATCH);
    const j = await apiFetch(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${chunk.join(
        "|"
      )}&props=sitelinks&format=json&origin=*`
    );
    for (const qid of chunk) {
      const sl = j?.entities?.[qid]?.sitelinks ?? {};
      const en = sl.enwiki?.title;
      const fr = sl.frwiki?.title;
      if (en || fr) titles.set(qid, { ...(en ? { en } : {}), ...(fr ? { fr } : {}) });
    }
    await sleep(600);
  }
  console.log(`  Wikidata : ${titles.size}/${qids.length} résolus en titres`);

  // 2. fetch du wikitext COMPLET (EN, secours FR)
  const enTitles = [...new Set([...titles.values()].map((t) => t.en).filter(Boolean))];
  const frTitles = [
    ...new Set(
      [...titles.values()].filter((t) => !t.en).map((t) => t.fr).filter(Boolean)
    ),
  ] as string[];

  const wikitexts = new Map<string, string>();
  for (const lang of ["en", "fr"] as const) {
    const list = lang === "en" ? (enTitles as string[]) : frTitles;
    if (list.length === 0) continue;
    for (let i = 0; i < list.length; i += BATCH) {
      const chunk = list.slice(i, i + BATCH);
      const j = await apiFetch(
        `https://${lang}.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&format=json&formatversion=2&titles=${encodeURIComponent(
          chunk.join("|")
        )}`
      );
      for (const p of j?.query?.pages ?? []) {
        const content = p?.revisions?.[0]?.slots?.main?.content;
        if (typeof content === "string") wikitexts.set(p.title!, content);
      }
      await sleep(600);
    }
    console.log(`  ${lang} : ${wikitexts.size} wikitexts cumulés`);
  }

  // 3. parse du palmarès → écriture du dataset
  let withCareer = 0;
  for (const [slug, qid] of todo) {
    const t = titles.get(qid);
    const title = t?.en ?? t?.fr;
    if (!title || !wikitexts.has(title)) {
      delete existing[slug]?.bouts; // plus de tableau exploitable (--all)
      continue;
    }
    const bouts = parseBoxerCareer(wikitexts.get(title)!);
    if (bouts.length > 0) {
      existing[slug] = {
        name: (existing[slug]?.name ?? names.get(slug) ?? slug),
        bouts,
      };
      withCareer++;
    } else {
      delete existing[slug]?.bouts;
    }
  }

  writeFileSync(OUT, JSON.stringify(existing, null, 2) + "\n", "utf8");
  const withBouts = Object.values(existing).filter((e) => e.bouts?.length).length;
  console.log(
    `\nÉcrit : ${withBouts} boxeurs avec palmarès complet (${withCareer} nouveaux) → ${OUT}`
  );
  console.log("Commit le JSON : c'est un dataset, comme les autres sources.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
