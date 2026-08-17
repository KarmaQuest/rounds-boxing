import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getCombatsAvenir, getCombatsRecents } from "@/lib/data";
import { JsonLd } from "@/components/json-ld";
import { FightCardSkeleton } from "@/components/skeleton";
import { fightImportance } from "@/lib/data/utils";
import { Suspense } from "react";

// Code-splitting : les onglets animés ne se chargent qu'ici (AUDIT §2 P2).
const FightTabs = dynamic(
  () => import("@/components/combats/tabs").then((m) => m.FightTabs),
  {
    loading: () => (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <FightCardSkeleton key={i} />
        ))}
      </div>
    ),
  }
);

export const metadata: Metadata = {
  title: "Combats",
  description:
    "Les prochains grands combats de boxe avec cotes, et les résultats récents des meilleurs boxeurs.",
  alternates: { canonical: "/combats" },
};

async function Fights() {
  // Limite haute (50) : les filtres client (organisation, recherche) doivent
  // porter sur TOUS les combats à venir, pas sur un échantillon de 12.
  const [{ fights: upcoming }, { fights: recent }] = await Promise.all([
    getCombatsAvenir(50),
    getCombatsRecents(12),
  ]);

  // TASKS 1.4 : les grosses affiches passent dans « Les affiches du moment ».
  const featured = upcoming.filter((f) => fightImportance(f) >= 3);
  const others = upcoming.filter((f) => fightImportance(f) < 3);

  // Données structurées : chaque affiche à venir est un événement sportif.
  const events = upcoming.map((f) => ({
    "@type": "SportsEvent",
    name: `${f.fighters[0]!.name} vs ${f.fighters[1]!.name}`,
    startDate: f.date,
    sport: "Boxe",
    eventStatus: "https://schema.org/EventScheduled",
    description: [f.title, f.venue, f.location].filter(Boolean).join(" — "),
    location: f.location
      ? { "@type": "Place", name: f.location }
      : undefined,
  }));

  return (
    <>
      {events.length > 0 && <JsonLd data={{ "@context": "https://schema.org", "@graph": events }} />}
      <FightTabs featured={featured} upcoming={others} recent={recent} />
    </>
  );
}

export default function CombatsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold">
          Rings & cotes
        </p>
        <h1 className="mt-2 font-display text-4xl uppercase tracking-wide text-snow sm:text-5xl">
          Les <span className="text-gold text-glow-gold">combats</span>
        </h1>
        <p className="mt-3 max-w-xl text-sm text-mist">
          Les affiches à venir avec leurs cotes, et les derniers résultats
          validés. Les cotes proviennent de The Odds API (actualisées toutes les
          10 min).
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <FightCardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <Fights />
      </Suspense>
    </div>
  );
}
