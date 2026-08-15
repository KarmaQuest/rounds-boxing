import type { Metadata } from "next";
import { Suspense } from "react";
import { Comparateur } from "@/components/comparateur/comparator";

export const metadata: Metadata = {
  title: "Comparateur — tale of the tape",
  description:
    "Compare deux boxeurs côte à côte : palmarès, % KO, taille, allonge, âge. Le comparateur est partageable par URL.",
  alternates: { canonical: "/comparateur" },
};

export default function ComparateurPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold">
          Tale of the tape
        </p>
        <h1 className="mt-2 font-display text-4xl uppercase tracking-wide text-snow sm:text-5xl">
          Le <span className="text-neon text-glow-red">comparateur</span>
        </h1>
        <p className="mt-3 max-w-xl text-sm text-mist">
          Deux boxeurs côte à côte : palmarès, fiches techniques et stats
          gagnantes mises en évidence. La sélection est dans l’URL, prête à
          partager.
        </p>
      </div>

      <Suspense
        fallback={
          <p className="text-center text-sm text-fog">
            Chargement du comparateur…
          </p>
        }
      >
        <Comparateur />
      </Suspense>
    </div>
  );
}
