"use client";

import { ExternalLink, Newspaper, PlayCircle } from "lucide-react";
import type { NewsItem } from "@/lib/news/types";

/** Carte article : texte + source. */
export function ArticleCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex h-full flex-col rounded-2xl border border-line/60 bg-panel p-5 transition-all duration-300 hover:-translate-y-1 hover:border-neon/40 hover:shadow-neon-sm"
    >
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
    </a>
  );
}

/**
 * Carte vidéo : miniature + lecture. Si `onPlay` est fourni, le clic ouvre
 * le lecteur embarqué (modal) ; sinon lien externe.
 */
export function VideoCard({
  item,
  onPlay,
}: {
  item: NewsItem;
  onPlay?: (item: NewsItem) => void;
}) {
  const inner = (
    <>
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
    </>
  );

  const cls =
    "group flex h-full flex-col overflow-hidden rounded-2xl border border-line/60 bg-panel transition-all duration-300 hover:-translate-y-1 hover:border-neon/40 hover:shadow-neon-sm";

  if (onPlay) {
    return (
      <button type="button" onClick={() => onPlay(item)} className={`${cls} w-full text-left`}>
        {inner}
      </button>
    );
  }

  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className={cls}>
      {inner}
    </a>
  );
}
