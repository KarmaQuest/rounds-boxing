"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ExternalLink, Newspaper, PlayCircle, Radio } from "lucide-react";
import type { NewsFilter, NewsItem } from "@/lib/news/types";

const TABS: Array<{ key: NewsFilter; label: string }> = [
  { key: "all", label: "Toutes" },
  { key: "articles", label: "Articles" },
  { key: "videos", label: "Vidéos" },
];

/** Onglets Toutes / Articles / Vidéos. */
function NewsTabs({ tab, onChange }: { tab: NewsFilter; onChange: (t: NewsFilter) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Type d’actualités"
      className="flex rounded-full border border-line bg-ink/60 p-1"
    >
      {TABS.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={tab === t.key}
          onClick={() => onChange(t.key)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-300 ${
            tab === t.key
              ? "bg-neon text-white shadow-neon-sm"
              : "text-mist hover:text-snow"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Dégradé néon généré depuis le nom de source (fallback sans image). */
function SourceGradient({ source }: { source: string }) {
  // deux couleurs stables par source → cartes reconnaissables
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }
  const hue1 = hash % 360;
  const hue2 = (hue1 + 60) % 360;
  return (
    <div
      aria-hidden
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background: `linear-gradient(135deg, hsl(${hue1} 70% 22%), hsl(${hue2} 75% 12%))`,
      }}
    >
      <span className="font-display text-6xl uppercase text-white/25">
        {source.charAt(0)}
      </span>
    </div>
  );
}

/** Carte article : miniature + texte + source. */
function ArticleCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line/60 bg-panel transition-all duration-300 hover:-translate-y-1 hover:border-neon/40 hover:shadow-neon-sm"
    >
      <div className="relative aspect-video overflow-hidden bg-ink">
        {item.thumbnail ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={item.thumbnail}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <SourceGradient source={item.source} />
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-fog">
          <Newspaper size={13} aria-hidden />
          <span>{item.source}</span>
        </div>
        <h3 className="line-clamp-3 font-display text-lg uppercase leading-snug tracking-wide text-snow transition-colors group-hover:text-neon-soft">
          {item.title}
        </h3>
        {item.description && (
          <p className="mt-2 line-clamp-2 text-sm text-mist">{item.description}</p>
        )}
        <span className="mt-auto flex items-center gap-1 pt-4 text-xs text-fog">
          <ExternalLink size={12} aria-hidden />
          Lire l’article
        </span>
      </div>
    </a>
  );
}

/** Carte vidéo : miniature + durée inconnue (pas fournie par le flux). */
function VideoCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line/60 bg-panel transition-all duration-300 hover:-translate-y-1 hover:border-neon/40 hover:shadow-neon-sm"
    >
      <div className="relative aspect-video overflow-hidden bg-ink">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.thumbnail}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-ink/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-neon text-white shadow-neon-sm">
            <PlayCircle size={26} aria-hidden />
          </span>
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-neon-soft">
          {item.source}
        </p>
        <h3 className="mt-1 line-clamp-2 font-display text-base uppercase leading-snug tracking-wide text-snow transition-colors group-hover:text-neon-soft">
          {item.title}
        </h3>
      </div>
    </a>
  );
}

function SkeletonCard() {
  return (
    <div className="h-56 animate-pulse rounded-2xl border border-line/60 bg-panel" />
  );
}

/**
 * Section « Actualités » : onglets + grille, chargée côté client via /api/news.
 *
 * `header` (défaut true) : sur l'accueil, la section affiche son propre titre ;
 * sur la page /actualite le titre est fourni par la page (évite le doublon).
 */
export function NewsSection({ header = true }: { header?: boolean }) {
  const [tab, setTab] = useState<NewsFilter>("all");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["news", tab],
    queryFn: async () => {
      const res = await fetch(`/api/news?type=${tab}&limit=9`);
      if (!res.ok) throw new Error("news");
      const json = (await res.json()) as { items: NewsItem[] };
      return json.items;
    },
    staleTime: 60_000,
  });

  const items = useMemo(() => data ?? [], [data]);

  // pas d'actualités (pannes réseau amont) → on ne casse pas la page
  if (isError || (!isLoading && items.length === 0)) return null;

  return (
    <section id="actualites" className="relative border-y border-line/60 bg-panel/40">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        {header && (
          <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-neon-soft">
                <Radio size={14} aria-hidden /> En direct du ring
              </p>
              <h2 className="mt-2 font-display text-4xl uppercase tracking-wide text-snow sm:text-5xl">
                L’actu <span className="text-neon text-glow-red">boxe</span>
              </h2>
              <p className="mt-2 max-w-lg text-sm text-mist">
                Derniers articles et vidéos des meilleures sources : Bad Left
                Hook, World Boxing News, DAZN, Top Rank, Matchroom…
              </p>
            </div>

            {/* Onglets */}
            <NewsTabs tab={tab} onChange={setTab} />
          </div>
        )}

        {/* Page /actualite : le titre est déjà en haut de page, on garde
            seulement les onglets. */}
        {!header && (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <NewsTabs tab={tab} onChange={setTab} />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : items.map((item) =>
                item.type === "video" ? (
                  <VideoCard key={item.id} item={item} />
                ) : (
                  <ArticleCard key={item.id} item={item} />
                )
              )}
        </div>
      </div>
    </section>
  );
}
