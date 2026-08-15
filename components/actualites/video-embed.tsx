"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { X } from "lucide-react";
import type { NewsItem, VideoPlatform } from "@/lib/news/types";

/**
 * URL d'embed d'une vidéo selon sa plateforme — extensible : on ajoute un
 * cas par plateforme (YouTube aujourd'hui, Vimeo/Dailymotion demain…).
 */
export function getEmbedUrl(item: NewsItem): string | null {
  if (item.type !== "video" || !item.videoId) return null;
  switch (item.platform as VideoPlatform) {
    case "youtube":
      return `https://www.youtube-nocookie.com/embed/${item.videoId}?autoplay=1`;
    default:
      return null;
  }
}

/**
 * Modal de lecture embarquée : iframe de la plateforme, fermeture par
 * Échap, clic sur le fond ou bouton ✕. Accessible (role=dialog, focus).
 */
export function VideoModal({
  item,
  onClose,
}: {
  item: NewsItem;
  onClose: () => void;
}) {
  const embedUrl = getEmbedUrl(item);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // verrouille le scroll pendant la lecture
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/90 p-4 backdrop-blur-sm"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={`Lecture : ${item.title}`}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 8 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-line bg-panel panel-glow"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-4 border-b border-line/60 px-5 py-3">
            <p className="min-w-0 truncate font-display text-sm uppercase tracking-wide text-snow">
              {item.source} — {item.title}
            </p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer la vidéo"
              className="press flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-mist transition-colors hover:border-neon/60 hover:text-neon"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
          {embedUrl ? (
            <div className="aspect-video w-full">
              <iframe
                src={embedUrl}
                title={item.title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="p-10 text-center text-sm text-mist">
              Lecture non disponible pour cette plateforme.
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
