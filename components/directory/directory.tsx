"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, SearchX } from "lucide-react";
import type { Fighter } from "@/lib/data/types";
import { applyFilters } from "@/lib/data/utils";
import { FighterCard } from "@/components/fighter-card";
import { FighterGridSkeleton } from "@/components/skeleton";
import {
  DEFAULT_FILTERS,
  Filters,
  isSortKey,
  isWeightClass,
  type FilterState,
} from "./filters";

interface ApiResponse {
  fighters: Fighter[];
  source: string;
  count: number;
}

const PAGE_SIZE = 24;

/** Charge une page de boxeurs (TASKS 2.1 — pagination côté API). */
async function fetchFightersPage(offset: number): Promise<ApiResponse> {
  const res = await fetch(`/api/boxeurs?limit=${PAGE_SIZE}&offset=${offset}`);
  if (!res.ok) throw new Error("Échec du chargement");
  return res.json();
}

/** Lit l'état initial des filtres depuis l'URL (valeurs validées). */
function filtersFromUrl(sp: URLSearchParams): FilterState {
  const cat = sp.get("cat") ?? "";
  const tri = sp.get("tri") ?? "rank";
  return {
    q: sp.get("q") ?? "",
    weightClass: isWeightClass(cat) ? cat : "",
    country: sp.get("pays") ?? "",
    minWins: Math.max(0, Number(sp.get("v") ?? 0)),
    minKoPct: Math.max(0, Number(sp.get("ko") ?? 0)),
    sort: isSortKey(tri) ? tri : "rank",
  };
}

/**
 * Le répertoire : on charge une fois la liste (mise en cache par la
 * couche données + React Query), puis TOUS les filtres sont appliqués
 * instantanément côté client — aucune latence réseau en filtrant.
 */
export function Directory() {
  const router = useRouter();
  const sp = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(() => filtersFromUrl(sp));

  // Synchronise l'URL avec les filtres (partageable, back/forward).
  // Dans un useEffect (PAS dans l'updater de setFilters : un side-effect
  // pendant le render provoque « Cannot update a component (Router) while
  // rendering a different component (Directory) »).
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return; // on ne réécrit pas l'URL d'entrée (préserve ?page=N)
    }
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.weightClass) params.set("cat", filters.weightClass);
    if (filters.country) params.set("pays", filters.country);
    if (filters.minWins > 0) params.set("v", String(filters.minWins));
    if (filters.minKoPct > 0) params.set("ko", String(filters.minKoPct));
    if (filters.sort !== "rank") params.set("tri", filters.sort);
    const qs = params.toString();
    router.replace(qs ? `/boxeurs?${qs}` : "/boxeurs", { scroll: false });
  }, [filters, router]);

  const initialPage = Math.max(1, Number(sp.get("page") ?? 1) || 1);

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["boxeurs"],
      queryFn: ({ pageParam }) => fetchFightersPage(pageParam as number),
      initialPageParam: (initialPage - 1) * PAGE_SIZE,
      getNextPageParam: (last, _all, lastParam) =>
        last.fighters.length < PAGE_SIZE ? undefined : (lastParam as number) + PAGE_SIZE,
      staleTime: 1000 * 60 * 10,
    });

  const fighters = useMemo(
    () => data?.pages.flatMap((p) => p.fighters) ?? [],
    [data]
  );

  const loadMore = () => {
    fetchNextPage();
    const nextPage = Math.floor(fighters.length / PAGE_SIZE) + 1;
    router.replace(nextPage > 1 ? `/boxeurs?page=${nextPage}` : "/boxeurs", {
      scroll: false,
    });
  };

  const filtered = useMemo(
    () =>
      applyFilters(fighters, {
        q: filters.q || undefined,
        weightClass: filters.weightClass || undefined,
        country: filters.country || undefined,
        minWins: filters.minWins || undefined,
        minKoPct: filters.minKoPct || undefined,
        sort: filters.sort,
      }),
    [fighters, filters]
  );

  const updateFilters = (patch: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const reset = () => {
    setFilters(DEFAULT_FILTERS);
  };

  return (
    <div className="space-y-6">
      <Filters
        filters={filters}
        onChange={updateFilters}
        onReset={reset}
        fighters={fighters}
      />

      {/* compteur + source */}
      <div className="flex items-center justify-between text-xs text-fog">
        <p>
          <span className="font-semibold text-snow">{filtered.length}</span>{" "}
          boxeur{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}
          {filters.weightClass && (
            <>
              {" · "}
              <span className="text-mist">{filters.weightClass}</span>
            </>
          )}
        </p>
        {data?.pages[0]?.source && (
          <p className="hidden sm:block">
            Source : <span className="text-mist">{data.pages[0].source}</span>
          </p>
        )}
      </div>

      {isLoading && <FighterGridSkeleton count={8} />}

      {isError && !isLoading && (
        <div className="rounded-2xl border border-loss/40 bg-loss/10 p-10 text-center text-mist">
          Impossible de charger les boxeurs. Réessaie dans un instant.
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-panel/50 px-6 py-16 text-center"
        >
          <SearchX size={40} aria-hidden className="text-fog" />
          <p className="font-display text-xl uppercase text-snow">Aucun boxeur trouvé</p>
          <p className="max-w-sm text-sm text-mist">
            Aucun boxeur ne correspond à ces critères. Essaie de relâcher les
            filtres ou de changer de catégorie.
          </p>
          <button
            onClick={reset}
            className="mt-2 rounded-full border border-neon/60 px-5 py-2 text-sm font-medium text-neon-soft transition-colors hover:bg-neon/10"
          >
            Réinitialiser les filtres
          </button>
        </motion.div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <motion.div
          layout
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((fighter, i) => (
              <FighterCard key={fighter.slug} fighter={fighter} index={i} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Charger plus (TASKS 2.1) */}
      {!isLoading && !isError && hasNextPage && filtered.length > 0 && (
        <div className="flex justify-center pt-2">
          <button
            onClick={loadMore}
            disabled={isFetchingNextPage}
            className="inline-flex items-center gap-2 rounded-full border border-neon/60 px-6 py-2.5 text-sm font-medium text-neon-soft transition-colors hover:bg-neon/10 disabled:opacity-60"
          >
            {isFetchingNextPage && <Loader2 size={15} aria-hidden className="animate-spin" />}
            {isFetchingNextPage ? "Chargement…" : "Charger plus"}
          </button>
        </div>
      )}

      {!isLoading && !isError && fighters.length === 0 && (
        <p className="text-center text-xs text-fog">
          Astuce : ajoute une clé API (Big Balls Sports Data, TheSportsDB) dans
          `.env.local` pour charger de vrais boxeurs — voir `.env.example`.
        </p>
      )}
    </div>
  );
}
