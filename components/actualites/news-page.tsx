"use client";

import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowDownWideNarrow, ArrowUpWideNarrow, Loader2, Search, SearchX } from "lucide-react";
import { ARTICLE_SOURCES, VIDEO_CHANNELS } from "@/lib/news/sources";
import type { NewsFilter, NewsItem, NewsPage } from "@/lib/news/types";
import { ArticleCard, VideoCard } from "@/components/news/cards";
import { VideoModal } from "./video-embed";

const PAGE_SIZE = 24;
const TABS: Array<{ key: NewsFilter; label: string }> = [
  { key: "all", label: "Toutes" },
  { key: "articles", label: "Articles" },
  { key: "videos", label: "Vidéos" },
];

interface PageResult extends NewsPage {
  offset: number;
  limit: number;
}

async function fetchPage(
  type: NewsFilter,
  q: string,
  source: string,
  sort: "asc" | "desc",
  offset: number
): Promise<PageResult> {
  const params = new URLSearchParams({ type, sort, limit: String(PAGE_SIZE), offset: String(offset) });
  if (q) params.set("q", q);
  if (source) params.set("source", source);
  const res = await fetch(`/api/news?${params.toString()}`);
  if (!res.ok) throw new Error("actualités");
  const page = (await res.json()) as NewsPage;
  return { ...page, offset, limit: PAGE_SIZE };
}

/** Page /actualites : recherche floue, onglets, chips sources, tri, pagination. */
export function NewsPage() {
  const [tab, setTab] = useState<NewsFilter>("all");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [source, setSource] = useState("");
  const [sort, setSort] = useState<"asc" | "desc">("desc");
  const [playing, setPlaying] = useState<NewsItem | null>(null);

  // debounce de la recherche (300 ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["actualites", tab, debouncedQ, source, sort],
      queryFn: ({ pageParam }) => fetchPage(tab, debouncedQ, source, sort, pageParam as number),
      initialPageParam: 0,
      getNextPageParam: (last) => (last.hasMore ? last.offset + last.limit : undefined),
      staleTime: 60_000,
    });

  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const total = data?.pages[0]?.total ?? 0;

  const sources = useMemo(() => {
    const names = new Map<string, string>();
    for (const s of ARTICLE_SOURCES) names.set(s.id, s.name);
    for (const c of VIDEO_CHANNELS) names.set(c.id, c.name);
    return [...names.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, []);

  const activeFilters = [tab !== "all", debouncedQ !== "", source !== "", sort !== "desc"].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      {/* ── En-tête ── */}
      <div className="mb-10">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-neon-soft">
          <Search size={14} aria-hidden /> En direct du ring
        </p>
        <h1 className="mt-2 font-display text-5xl uppercase tracking-wide text-snow sm:text-6xl">
          L’actu <span className="text-neon text-glow-red">boxe</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-mist">
          Articles et vidéos des meilleures sources : Bad Left Hook, World
          Boxing News, DAZN, Top Rank, Matchroom… Recherche tolérante aux
          typos, filtres par source, lecture intégrée.
        </p>
      </div>

      {/* ── Contrôles ── */}
      <div className="mb-8 space-y-4 rounded-2xl border border-line/60 bg-panel/70 p-4 panel-glow sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* recherche floue */}
          <div className="relative flex-1">
            <Search size={16} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fog" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher dans les titres (typos OK)…"
              aria-label="Rechercher dans les actualités"
              className="h-11 w-full rounded-full border border-line bg-ink/60 pl-10 pr-4 text-sm text-snow placeholder:text-fog focus:border-neon/70 focus:outline-none focus:ring-2 focus:ring-neon/20"
            />
          </div>

          {/* onglets */}
          <div role="tablist" aria-label="Type d’actualités" className="flex rounded-full border border-line bg-ink/60 p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-300 ${
                  tab === t.key ? "bg-neon text-white shadow-neon-sm" : "text-mist hover:text-snow"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* tri */}
          <button
            type="button"
            onClick={() => setSort((s) => (s === "desc" ? "asc" : "desc"))}
            aria-label={sort === "desc" ? "Trier par plus ancien" : "Trier par plus récent"}
            className="press flex h-11 items-center gap-2 rounded-full border border-line px-4 text-xs font-medium text-mist transition-colors hover:border-neon/60 hover:text-neon"
          >
            {sort === "desc" ? <ArrowDownWideNarrow size={14} aria-hidden /> : <ArrowUpWideNarrow size={14} aria-hidden />}
            {sort === "desc" ? "Plus récents" : "Plus anciens"}
          </button>
        </div>

        {/* chips par source */}
        <div className="thin-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <button
            type="button"
            onClick={() => setSource("")}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              source === "" ? "border-neon/70 bg-neon/15 text-snow" : "border-line bg-panel text-mist hover:text-snow"
            }`}
          >
            Toutes les sources
          </button>
          {sources.map(([id, name]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSource(source === id ? "" : id)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                source === id ? "border-neon/70 bg-neon/15 text-snow" : "border-line bg-panel text-mist hover:text-snow"
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        <p className="text-xs text-fog">
          {isLoading ? "Chargement…" : `${total} actualité${total > 1 ? "s" : ""}`}
          {activeFilters > 0 && ` · ${activeFilters} filtre${activeFilters > 1 ? "s" : ""} actif${activeFilters > 1 ? "s" : ""}`}
        </p>
      </div>

      {/* ── Erreur / vide / grille ── */}
      {isError && !isLoading && (
        <div className="rounded-2xl border border-loss/40 bg-loss/10 p-10 text-center text-mist">
          Impossible de charger les actualités. Réessaie dans un instant.
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-panel/50 px-6 py-16 text-center">
          <SearchX size={40} aria-hidden className="text-fog" />
          <p className="font-display text-xl uppercase text-snow">Aucune actualité trouvée</p>
          <p className="max-w-sm text-sm text-mist">
            Essaie une autre recherche ou relâche les filtres.
          </p>
          <button
            type="button"
            onClick={() => { setQ(""); setDebouncedQ(""); setSource(""); setTab("all"); }}
            className="press mt-2 rounded-full border border-neon/60 px-5 py-2 text-sm font-medium text-neon-soft transition-colors hover:bg-neon/10"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl border border-line/60 bg-panel" />
            ))
          : items.map((item) =>
              item.type === "video" ? (
                <VideoCard key={item.id} item={item} onPlay={setPlaying} />
              ) : (
                <ArticleCard key={item.id} item={item} />
              )
            )}
      </div>

      {!isLoading && hasNextPage && (
        <div className="flex justify-center pt-8">
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="press inline-flex items-center gap-2 rounded-full border border-neon/60 px-6 py-2.5 text-sm font-medium text-neon-soft transition-colors hover:bg-neon/10 disabled:opacity-60"
          >
            {isFetchingNextPage && <Loader2 size={15} aria-hidden className="animate-spin" />}
            {isFetchingNextPage ? "Chargement…" : "Charger plus"}
          </button>
        </div>
      )}

      {/* lecteur embarqué (multi-plateforme) */}
      {playing && <VideoModal item={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
}
