// Rafraîchit le snapshot Wikipedia des palmarès (wikipedia-records.json).
//
// Usage :  npx tsx scripts/refresh-wikipedia.ts   (~1-2 min)
//
// Couvre le pool visible dans l'app : les ~1500 premiers boxeurs Big Balls
// (ordre alphabétique de l'API) + les stars du mock (hors pool). Pour chaque
// boxeur on résout le titre Wikipedia via son ID Wikidata (par lots de 50),
// on récupère la section 0 du wikitext (infobox) par lots, et on parse la
// meilleure fiche fr/en. Poli envers les APIs : User-Agent descriptif,
// requêtes groupées (50/req), pacing ~600 ms, retry avec backoff sur 429.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseBoxerInfobox } from "../lib/data/providers/wikipedia-parse.ts";
import { FIGHTERS } from "../lib/data/providers/mock.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(
  __dirname,
  "..",
  "lib",
  "data",
  "providers",
  "wikipedia-records.json"
);

// charge .env.local (clé Big Balls) — tsx ne le fait pas automatiquement
const envFile = join(__dirname, "..", ".env.local");
try {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2]!;
  }
} catch {
  /* pas de .env.local → pool Big Balls vide (mock seul) */
}

const UA =
  "ROUNDS-Boxing/0.1 (https://rounds.app - refresh wikipedia records, contact: dev@rounds.app)";
const POOL = 1500; // boxeurs Big Balls couverts (taille du pool visible)
const BATCH = 50; // IDs / titres par requête (max API)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Enveloppe Big Balls ({ data, meta, error }) — champs utilisés seulement. */
interface ApiAthlete {
  name?: string;
  external_ids?: { wikidata?: string | null };
  current_ranking?: unknown;
}
interface ApiEnvelope {
  data?: ApiAthlete[];
  meta?: unknown;
  error?: unknown;
}

async function apiFetch(url: string, init?: RequestInit): Promise<ApiEnvelope | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: {
          "user-agent": UA,
          accept: "application/json",
          ...(init?.headers ?? {}),
        },
      });
      if (res.status === 429) {
        const wait = Number(res.headers.get("retry-after") ?? 5) * 1000;
        console.log(`  429 → pause ${Math.round(wait / 1000)}s`);
        await sleep(wait);
        continue;
      }
      return res.ok ? await res.json() : null;
    } catch {
      if (attempt === 3) return null;
      await sleep(1500 * attempt);
    }
  }
  return null;
}

interface Athlete {
  name: string;
  slug: string;
  wikidata?: string | null;
  ranked: boolean;
}

/** Récupère le pool Big Balls (paginé, ordre alphabétique de l'API). */
async function fetchBigBallsPool(): Promise<Athlete[]> {
  const key = process.env.BBS_API_KEY;
  if (!key) {
    console.warn("BBS_API_KEY absente — pool Big Balls vide (mock seul).");
    return [];
  }
  const out: Athlete[] = [];
  const seen = new Set<string>();
  for (let offset = 0; offset < POOL && offset < 12_000; offset += 100) {
    const j = await apiFetch(
      `https://api.bigballsdata.com/v1/athletes?sport=boxing&limit=100&offset=${offset}`,
      { headers: { authorization: `Bearer ${key}` } }
    );
    const data = j?.data ?? [];
    if (data.length === 0) break;
    for (const a of data) {
      const name = (a?.name ?? "").trim();
      if (!name) continue;
      const slug = slugify(name);
      if (seen.has(slug)) continue;
      seen.add(slug);
      out.push({
        name,
        slug,
        wikidata: a?.external_ids?.wikidata ?? null,
        ranked: Boolean(a?.current_ranking),
      });
    }
    await sleep(400);
  }
  console.log(`  Big Balls : ${out.length} boxeurs couverts`);
  return out;
}

/** slugify identique à lib/data/utils.ts (sans dépendre du module serveur). */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Résout les titres Wikipedia (fr/en) depuis les IDs Wikidata (par lots). */
async function resolveTitles(
  byQid: Map<string, Athlete>
): Promise<Map<string, { fr?: string; en?: string }>> {
  const titles = new Map<string, { fr?: string; en?: string }>();
  const qids = [...byQid.keys()];
  for (let i = 0; i < qids.length; i += BATCH) {
    const chunk = qids.slice(i, i + BATCH);
    const j = await apiFetch(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${chunk.join(
        "|"
      )}&props=sitelinks&format=json&origin=*`
    );
    const entities = j?.entities ?? {};
    for (const qid of chunk) {
      const sl = entities[qid]?.sitelinks ?? {};
      const fr = sl.frwiki?.title;
      const en = sl.enwiki?.title;
      if (fr || en) titles.set(qid, { ...(fr ? { fr } : {}), ...(en ? { en } : {}) });
    }
    await sleep(600);
  }
  console.log(`  Wikidata : ${titles.size}/${qids.length} résolus en titres`);
  return titles;
}

/** Récupère le wikitext (section 0 = infobox) de titres par lots, sur la
 *  Wikipédia de la langue demandée. */
async function fetchWikitexts(
  lang: "fr" | "en",
  titles: string[]
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let i = 0; i < titles.length; i += BATCH) {
    const chunk = titles.slice(i, i + BATCH);
    const j = await apiFetch(
      `https://${lang}.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&rvsection=0&redirects=1&format=json&formatversion=2&titles=${encodeURIComponent(
        chunk.join("|")
      )}`
    );
    const pages = j?.query?.pages ?? [];
    for (const p of pages) {
      const content = p?.revisions?.[0]?.slots?.main?.content;
      if (typeof content === "string") out.set(p.title, content);
    }
    await sleep(600);
  }
  return out;
}

/** Score de complétude : nombre de champs utiles renseignés. */
function completeness(p: NonNullable<ReturnType<typeof parseBoxerInfobox>>): number {
  let s = 0;
  if (p.record.wins !== undefined) s++;
  if (p.record.losses !== undefined) s++;
  if (p.record.draws !== undefined) s++;
  if (p.record.ko !== undefined) s++;
  if (p.heightCm) s++;
  if (p.reachCm) s++;
  if (p.stance) s++;
  if (p.weightClass) s++;
  return s;
}

function bestOf(
  a: NonNullable<ReturnType<typeof parseBoxerInfobox>>,
  b: NonNullable<ReturnType<typeof parseBoxerInfobox>>
): NonNullable<ReturnType<typeof parseBoxerInfobox>> {
  return completeness(b) > completeness(a) ? b : a;
}

/** Résout l'ID Wikidata des stars du mock via la recherche Big Balls. */
async function fetchStarWikidata(stars: Athlete[]): Promise<void> {
  const key = process.env.BBS_API_KEY;
  if (!key) return;
  for (const s of stars) {
    const j = await apiFetch(
      `https://api.bigballsdata.com/v1/athletes?sport=boxing&name=${encodeURIComponent(
        s.name
      )}&limit=3`,
      { headers: { authorization: `Bearer ${key}` } }
    );
    const hit = (j?.data ?? []).find(
      (a) => slugify(a?.name ?? "") === s.slug
    );
    s.wikidata = hit?.external_ids?.wikidata ?? null;
    await sleep(300);
  }
}

async function main() {
  console.log(`Rafraîchissement Wikipedia — pool ${POOL} + stars…`);

  // 1. pool Big Balls + stars du mock (Wikidata résolu par recherche)
  const pool = await fetchBigBallsPool();
  const stars: Athlete[] = FIGHTERS.filter(
    (f) => !pool.some((p) => p.slug === f.slug)
  ).map((f) => ({ name: f.name, slug: f.slug, wikidata: null, ranked: false }));
  await fetchStarWikidata(stars);
  // les stars du mock passent EN TÊTE : si la liste Wikipedia est tronquée
  // (limite du routeur), elles restent incluses
  const all = [...stars, ...pool];
  console.log(`  Total à traiter : ${all.length} boxeurs`);

  // 2. résolution des titres via Wikidata (par lots)
  const byQid = new Map<string, Athlete>();
  for (const a of all) if (a.wikidata) byQid.set(a.wikidata, a);
  const titlesByQid = await resolveTitles(byQid);

  // 3. wikitext fr (section 0) pour tous les titres fr connus
  const frTitles = [...titlesByQid.values()]
    .map((t) => t.fr)
    .filter((t): t is string => Boolean(t));
  const frWikitexts = await fetchWikitexts("fr", [...new Set(frTitles)]);
  console.log(`  fr : ${frWikitexts.size} wikitexts récupérés`);

  // 4. parse fr → snapshot intermédiaire ; on note qui a besoin de l'en
  const out: Record<string, unknown> = {};
  const needEn: string[] = [];
  const frParsed = new Map<string, NonNullable<ReturnType<typeof parseBoxerInfobox>>>();
  for (const a of all) {
    const t = a.wikidata ? titlesByQid.get(a.wikidata) : undefined;
    if (t?.fr && frWikitexts.has(t.fr)) {
      const p = parseBoxerInfobox(frWikitexts.get(t.fr)!);
      if (p) {
        frParsed.set(a.slug, p);
        continue; // fiche fr valide → pas besoin de l'en
      }
    }
    if (t?.en) needEn.push(t.en);
  }

  // 5. wikitext en (section 0) pour ceux sans fiche fr valide
  const enWikitexts = await fetchWikitexts("en", [...new Set(needEn)]);
  console.log(`  en : ${enWikitexts.size} wikitexts de secours`);

  // 6. merge fr + en (meilleure fiche) → snapshot final
  let ok = 0;
  for (const a of all) {
    const t = a.wikidata ? titlesByQid.get(a.wikidata) : undefined;
    let best = frParsed.get(a.slug) ?? null;
    if (t?.en && enWikitexts.has(t.en)) {
      const p = parseBoxerInfobox(enWikitexts.get(t.en)!);
      if (p) best = best ? bestOf(best, p) : p;
    }
    if (best) {
      out[a.slug] = { name: a.name, ...best };
      ok++;
    }
  }

  writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`\nÉcrit ${ok}/${all.length} fiches → ${OUT}`);
  console.log("Commit le JSON : c'est un dataset, comme les autres sources.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
