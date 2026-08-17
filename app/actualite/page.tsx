import type { Metadata } from "next";
import { NewsSection } from "@/components/home/news";
import { JsonLd } from "@/components/json-ld";

export const metadata: Metadata = {
  title: "Actualités Boxe",
  description:
    "Les dernières actualités de la boxe : articles, vidéos, résultats et interviews des meilleurs boxeurs du monde.",
  alternates: { canonical: "/actualite" },
};

export default function ActualitePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Actualités Boxe",
          description:
            "Les dernières actualités de la boxe : articles, vidéos, résultats et interviews.",
        }}
      />

      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neon-soft">
          En direct du ring
        </p>
        <h1 className="mt-2 font-display text-4xl uppercase tracking-wide text-snow sm:text-5xl">
          L&apos;actu <span className="text-neon text-glow-red">boxe</span>
        </h1>
        <p className="mt-3 max-w-xl text-sm text-mist">
          Derniers articles et vidéos des meilleures sources : Bad Left
          Hook, World Boxing News, DAZN, Top Rank, Matchroom…
        </p>
      </div>

      <NewsSection header={false} pageSize={12} pagination />
    </div>
  );
}
