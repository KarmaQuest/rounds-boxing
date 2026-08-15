import type { Metadata } from "next";
import { Suspense } from "react";
import { NewsPage } from "@/components/actualites/news-page";

export const metadata: Metadata = {
  title: "Actualités boxe",
  description:
    "Les dernières actualités de la boxe : articles et vidéos de Bad Left Hook, World Boxing News, DAZN, Top Rank, Matchroom et plus — recherche, filtres et lecture intégrée.",
  alternates: { canonical: "/actualites" },
  openGraph: {
    title: "Actualités boxe · ROUNDS",
    description:
      "Articles et vidéos des meilleures sources de boxe, avec recherche et lecture intégrée.",
  },
};

export default function ActualitesPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mb-10 h-32 animate-pulse rounded-2xl bg-panel" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl border border-line/60 bg-panel" />
            ))}
          </div>
        </div>
      }
    >
      <NewsPage />
    </Suspense>
  );
}
