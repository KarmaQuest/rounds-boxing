"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Radio } from "lucide-react";
import type { NewsFilter, NewsItem } from "@/lib/news/types";
import { ArticleCard, VideoCard } from "@/components/news/cards";

const TABS: Array<{ key: NewsFilter; label: string }> = [
  { key: "all", label: "Toutes" },
  { key: "articles", label: "Articles" },
  { key: "videos", label: "Vidéos" },
];

const PREVIEW_LIMIT = 6;

function SkeletonCard() {
  return <div className="h-56 animate-pulse rounded-2xl border border-line/60 bg-panel" />;
}

/**
 * Section « Actualités » de l'accueil : aperçu réduit (6 cartes) + lien
 * « Voir tout → » vers /actualites (page complète avec recherche, filtres,
 * pagination et lecteur embarqué).
 */
export function NewsSection() {
  const [tab, setTab] = useState<NewsFilter>("all");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["news", tab],
    queryFn: async () => {
      const res = await fetch(`/api/news?type=${tab}&limit=${PREVIEW_LIMIT}`);
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

          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            {/* Onglets */}
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
                  onClick={() => setTab(t.key)}
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

            <Link
              href="/actualites"
              className="link-underline text-sm font-medium text-mist transition-colors hover:text-neon"
            >
              Voir tout →
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: PREVIEW_LIMIT }).map((_, i) => <SkeletonCard key={i} />)
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
