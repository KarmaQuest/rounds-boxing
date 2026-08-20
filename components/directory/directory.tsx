"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, SearchX } from "lucide-react";
import type { Fighter } from "@/lib/data/types";
import { applyFilters, fuzzyScore } from "@/lib/data/utils";
import { weightClassLabel } from "@/lib/i18n/data";
import { useFormattedLocale } from "@/lib/hooks";
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

/**
 * Recherche serveur (q → API) : couvre TOUS les boxeurs de l'annuaire
 * (merged.json), pas seulement la liste déjà chargée côté client. Sans ça,
 * un boxeur hors pool n'apparaissait qu'après « Charger plus ».
 */
async function fetchSearch(q: string): Promise<ApiResponse> {
  const res = await fetch(`/api/boxeurs?q=${encodeURIComponent(q)}&limit=500`);
  if (!res.ok) throw new Error("Échec de la recherche");
  return res.json();
}

/**
 * Recherche serveur avec filtres genre/amateur : interroge l'API pour
 * obtenir TOUS les boxeurs correspondants (pas juste la page paginée).
 */
async function fetchFiltered(filters: {
  gender?: string;
  amateur?: string;
}): Promise<ApiResponse> {
  const params = new URLSearchParams({ limit: "500" });
  if (filters.gender && filters.gender !== "all") params.set("gender", filters.gender);
  if (filters.amateur && filters.amateur !== "all") params.set("amateur", filters.amateur);
  const res = await fetch(`/api/boxeurs?${params}`);
  if (!res.ok) throw new Error("Échec du filtrage");
  return res.json();
}

/** Lit l'état initial des filtres depuis l'URL (valeurs validées). */
function filtersFromUrl(sp: URLSearchParams): FilterState {
  const cat = sp.get("cat") ?? "";
  const tri = sp.get("tri") ?? "rank";
  const am = sp.get("am") ?? "all";
  const g = sp.get("g") ?? "all";
  return {
    q: sp.get("q") ?? "",
    weightClass: isWeightClass(cat) ? cat : "",
    country: sp.get("pays") ?? "",
    minWins: Math.max(0, Number(sp.get("v") ?? 0)),
    minKoPct: Math.max(0, Number(sp.get("ko") ?? 0)),
    sort: isSortKey(tri) ? tri : "rank",
    amateur: (am === "pro" || am === "amateur") ? am : "all",
    gender: (g === "M" || g === "F") ? g : "all",
  };
}

/**
 * Le répertoire : on charge une fois la liste (mise en cache par la
 * couche données + React Query), puis TOUS les filtres sont appliqués
 * instantanément côté client — aucune latence réseau en filtrant.
 */
export function Directory() {
  const t = useTranslations("boxeurs");
  const locale = useFormattedLocale();
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
    if (filters.amateur !== "all") params.set("am", filters.amateur);
    if (filters.gender !== "all") params.set("g", filters.gender);
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

  // Recherche : dès qu'on tape, la requête part à l'API (recherche sur tout
  // l'annuaire — bigballs + wikipedia + merged.json), sans attendre que le
  // boxeur soit dans la liste déjà chargée.
  const query = filters.q.trim();
  const hasAdvancedFilter = filters.gender !== "all" || filters.amateur !== "all";

  const { data: searchData, isFetching: isSearching } = useQuery({
    queryKey: ["boxeurs-search", query],
    queryFn: () => fetchSearch(query),
    enabled: query.length > 0,
    staleTime: 1000 * 60,
    placeholderData: (prev) => prev, // garde les résultats précédents pendant qu'on tape
  });

  // Quand genre ou amateur est sélectionné, interroger l'API pour
  // charger TOUS les boxeurs correspondants (pas juste la page paginée).
  const { data: filterData, isFetching: isFiltering } = useQuery({
    queryKey: ["boxeurs-filter", filters.gender, filters.amateur],
    queryFn: () => fetchFiltered({ gender: filters.gender, amateur: filters.amateur }),
    enabled: hasAdvancedFilter && query.length === 0,
    staleTime: 1000 * 60,
    placeholderData: (prev) => prev,
  });

  const filtered = useMemo(() => {
    // recherche texte → résultats API texte
    // filtre genre/amateur → résultats API filtrés
    // sinon → liste paginée chargée
    const useFilter = hasAdvancedFilter && query.length === 0 && filterData;
    const base = query ? searchData?.fighters ?? [] : useFilter ? filterData.fighters : fighters;
    if (!query && !useFilter) {
      return applyFilters(base, {
        weightClass: filters.weightClass || undefined,
        country: filters.country || undefined,
        minWins: filters.minWins || undefined,
        minKoPct: filters.minKoPct || undefined,
        sort: filters.sort,
        amateur: filters.amateur,
        gender: filters.gender,
      });
    }
    // mode recherche : les autres filtres s'appliquent, puis tri par
    // pertinence (le meilleur match en tête — ex. « Bakary Samake » en 1er)
    const list = applyFilters(base, {
      q: query,
      weightClass: filters.weightClass || undefined,
      country: filters.country || undefined,
      minWins: filters.minWins || undefined,
      minKoPct: filters.minKoPct || undefined,
      sort: "name",
      amateur: filters.amateur,
      gender: filters.gender,
    });
    list.sort(
      (a, b) =>
        fuzzyScore(query, a.name) - fuzzyScore(query, b.name) ||
        a.name.localeCompare(b.name)
    );
    return list;
  }, [fighters, searchData, filterData, filters, query, hasAdvancedFilter]);

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
          {t("countLabel", { count: filtered.length })}
          {filters.weightClass && (
            <>
              {" · "}
              <span className="text-mist">{weightClassLabel(filters.weightClass, locale)}</span>
            </>
          )}
        </p>
        {(query ? searchData?.source : data?.pages[0]?.source) && (
          <p className="hidden sm:block">
            {t("source")} :{" "}
            <span className="text-mist">
              {query ? searchData!.source : data!.pages[0]!.source}
            </span>
          </p>
        )}
      </div>

      {isLoading && <FighterGridSkeleton count={8} />}

      {isSearching && query.length > 0 && !searchData && (
        <FighterGridSkeleton count={8} />
      )}

      {isFiltering && hasAdvancedFilter && query.length === 0 && !filterData && (
        <FighterGridSkeleton count={8} />
      )}

      {isError && !isLoading && (
        <div className="rounded-2xl border border-loss/40 bg-loss/10 p-10 text-center text-mist">
          {t("error")}
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3 card border-dashed bg-panel/50 px-6 py-16 text-center"
        >
          <SearchX size={40} aria-hidden className="text-fog" />
          <p className="font-display text-xl uppercase text-snow">{t("none")}</p>
          <p className="max-w-sm text-sm text-mist">{t("noneText")}</p>
          <button
            onClick={reset}
            className="mt-2 btn-neon px-5 py-2"
          >
            {t("resetFilters")}
          </button>
        </motion.div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <motion.div
          layout
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((fighter, i) => (
              <FighterCard key={fighter.slug} fighter={fighter} index={i} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Charger plus (TASKS 2.1) — masqué en recherche ou filtre avancé :
          le serveur renvoie déjà tous les matchs d'un coup */}
      {!query && !hasAdvancedFilter && !isLoading && !isError && hasNextPage && filtered.length > 0 && (
        <div className="flex justify-center pt-2">
          <button
            onClick={loadMore}
            disabled={isFetchingNextPage}
            className="inline-flex items-center gap-2 btn-neon px-6 py-2.5"
          >
            {isFetchingNextPage && <Loader2 size={15} aria-hidden className="animate-spin" />}
            {isFetchingNextPage ? t("loading") : t("loadMore")}
          </button>
        </div>
      )}

      {!isLoading && !isError && fighters.length === 0 && (
        <p className="text-center text-xs text-fog">{t("tip")}</p>
      )}
    </div>
  );
}
