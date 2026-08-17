"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarDays, MapPin, Search, Trophy } from "lucide-react";
import type { Fight } from "@/lib/data/types";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

/** Slug d'organisation (source des shards) → libellé affiché. */
const ORG_LABELS: Record<string, string> = {
  ibf: "IBF",
  wba: "WBA",
  wbc: "WBC",
  wbo: "WBO",
  csac: "CSAC",
  nsac: "NSAC",
  ffboxe: "FFBoxe",
};

/** Carte compacte d'un combat programmé (calendrier officiel). */
function ScheduledCard({ fight }: { fight: Fight }) {
  const [a, b] = fight.fighters;
  return (
    <div className="group flex h-full flex-col rounded-2xl border border-line/60 bg-panel p-5 transition-all duration-300 hover:-translate-y-1 hover:border-neon/40 hover:shadow-neon-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
        <span className="flex items-center gap-1 rounded-full border border-neon/40 bg-neon/10 px-2 py-0.5 text-neon-soft">
          <CalendarDays size={11} aria-hidden />
          {formatDate(fight.date)}
        </span>
        {fight.source && (
          <span className="rounded-full border border-line/60 bg-panel-2 px-2 py-0.5 text-mist">
            {ORG_LABELS[fight.source] ?? fight.source}
          </span>
        )}
        {fight.amateur && (
          <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-gold">
            Amateur
          </span>
        )}
      </div>

      {fight.title && (
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gold">
          <Trophy size={13} aria-hidden /> {fight.title}
        </p>
      )}

      <p className="font-display text-lg uppercase leading-snug tracking-wide text-snow">
        <span className="block truncate">{a.name}</span>
        <span className="my-1 block text-center text-xs font-medium tracking-widest text-fog">
          VS
        </span>
        <span className="block truncate">{b.name}</span>
      </p>

      {fight.weightClass && (
        <p className="mt-2 text-xs font-medium text-mist">{fight.weightClass}</p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-xs text-fog">
        {fight.location && (
          <span className="flex items-center gap-1">
            <MapPin size={12} aria-hidden /> {fight.location}
          </span>
        )}
        {fight.promoter && <span>{fight.promoter}</span>}
        {fight.boutType && (
          <span className="rounded-full bg-ink/60 px-2 py-0.5 text-[10px] text-mist">
            {fight.boutType}
          </span>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return <div className="h-48 animate-pulse rounded-2xl border border-line/60 bg-panel" />;
}

/**
 * Combats à venir par organisation — données des calendriers officiels
 * (pipeline, vérifiées par IA). Zéro mock, zéro cotes.
 */
export function ProgrammationSection() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["combats", "programmation"],
    queryFn: async () => {
      const res = await fetch("/api/combats?scope=programmation");
      if (!res.ok) throw new Error("programmation");
      const json = (await res.json()) as { fights: Fight[] };
      return json.fights;
    },
    staleTime: 60_000,
  });

  const fights = useMemo(() => data ?? [], [data]);
  const orgs = useMemo(
    () =>
      [...new Set(fights.map((f) => f.source).filter((s): s is string => Boolean(s)))].sort(),
    [fights]
  );
  const hasAmateur = useMemo(() => fights.some((f) => f.amateur), [fights]);

  const [orgFilter, setOrgFilter] = useState("all");
  const [catFilter, setCatFilter] = useState<"all" | "pro" | "amateur">("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return fights.filter((f) => {
      if (orgFilter !== "all" && f.source !== orgFilter) return false;
      if (catFilter === "amateur" && !f.amateur) return false;
      if (catFilter === "pro" && f.amateur) return false;
      if (query) {
        const hay = `${f.fighters[0].name} ${f.fighters[1].name}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [fights, orgFilter, catFilter, q]);

  // panne ou aucune donnée → on ne casse pas la page
  if (isError || (!isLoading && fights.length === 0)) return null;

  const chip =
    "rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-300";

  return (
    <section id="programmation" className="relative scroll-mt-24 border-y border-line/60 bg-panel/40">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neon-soft">
              Programmation officielle
            </p>
            <h2 className="mt-2 font-display text-4xl uppercase tracking-wide text-snow sm:text-5xl">
              Combats <span className="text-neon text-glow-red">à venir</span>
            </h2>
            <p className="mt-2 max-w-lg text-sm text-mist">
              Les affiches annoncées par les organisations (WBC, IBF…),
              extraites des calendriers officiels et vérifiées par IA.
            </p>
          </div>

          {/* Recherche */}
          <label className="flex items-center gap-2 rounded-full border border-line bg-ink/60 px-4 py-2 text-sm text-mist focus-within:border-neon/50">
            <Search size={15} aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un boxeur…"
              className="w-48 bg-transparent text-snow placeholder:text-fog focus:outline-none sm:w-56"
            />
          </label>
        </div>

        {/* Filtres : organisation + pro/amateur */}
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setOrgFilter("all")}
              className={cn(
                chip,
                orgFilter === "all"
                  ? "border-neon/60 bg-neon text-white shadow-neon-sm"
                  : "border-line bg-ink/60 text-mist hover:text-snow"
              )}
            >
              Toutes ({fights.length})
            </button>
            {orgs.map((org) => (
              <button
                key={org}
                onClick={() => setOrgFilter(org)}
                className={cn(
                  chip,
                  orgFilter === org
                    ? "border-neon/60 bg-neon text-white shadow-neon-sm"
                    : "border-line bg-ink/60 text-mist hover:text-snow"
                )}
              >
                {ORG_LABELS[org] ?? org}
              </button>
            ))}
          </div>

          {hasAmateur && (
            <div
              role="tablist"
              aria-label="Pro ou amateur"
              className="ml-auto flex rounded-full border border-line bg-ink/60 p-1"
            >
              {(["all", "pro", "amateur"] as const).map((c) => (
                <button
                  key={c}
                  role="tab"
                  aria-selected={catFilter === c}
                  onClick={() => setCatFilter(c)}
                  className={cn(
                    "rounded-full px-3 py-1 text-sm font-medium capitalize transition-all",
                    catFilter === c
                      ? "bg-neon text-white shadow-neon-sm"
                      : "text-mist hover:text-snow"
                  )}
                >
                  {c === "all" ? "Tous" : c}
                </button>
              ))}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((fight) => (
              <ScheduledCard key={fight.id} fight={fight} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-line bg-panel/50 px-6 py-14 text-center text-sm text-mist">
            Aucun combat ne correspond à ces filtres.
          </p>
        )}
      </div>
    </section>
  );
}
