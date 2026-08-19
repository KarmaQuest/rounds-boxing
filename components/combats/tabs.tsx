"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import type { Fight } from "@/lib/data/types";
import { FightCard } from "@/components/fight-card";
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

interface TabsProps {
  /** affiches « du moment » (grosses cartes) — TASKS 1.4 */
  featured: Fight[];
  /** autres combats à venir */
  upcoming: Fight[];
  recent: Fight[];
}

/** Onglets avec indicateur animé + filtres par organisation et recherche texte. */
export function FightTabs({ featured, upcoming, recent }: TabsProps) {
  const t = useTranslations("fights");
  const [tab, setTab] = useState<"upcoming" | "recent">("upcoming");
  const [orgFilter, setOrgFilter] = useState("all");
  const [q, setQ] = useState("");

  const allUpcoming = useMemo(() => [...featured, ...upcoming], [featured, upcoming]);

  // organisations présentes dans l'onglet actif
  const orgs = useMemo(() => {
    const pool = tab === "upcoming" ? allUpcoming : recent;
    return [
      ...new Set(pool.map((f) => f.source).filter((s): s is string => Boolean(s))),
    ].sort();
  }, [tab, allUpcoming, recent]);

  const applyFilters = useCallback(
    (list: Fight[]) => {
      const query = q.trim().toLowerCase();
      return list.filter((f) => {
        if (orgFilter !== "all" && f.source !== orgFilter) return false;
        if (query) {
          const hay =
            `${f.fighters[0].name} ${f.fighters[1].name} ${f.title ?? ""} ${f.location ?? ""}`.toLowerCase();
          if (!hay.includes(query)) return false;
        }
        return true;
      });
    },
    [orgFilter, q]
  );

  const filteredFeatured = useMemo(() => applyFilters(featured), [applyFilters, featured]);
  const filteredUpcoming = useMemo(() => applyFilters(upcoming), [applyFilters, upcoming]);
  const filteredRecent = useMemo(() => applyFilters(recent), [applyFilters, recent]);

  const switchTab = (t: "upcoming" | "recent") => {
    setTab(t);
    setOrgFilter("all");
    setQ("");
  };

  const tabs = [
    {
      key: "upcoming" as const,
      label: t("tabUpcoming", { count: filteredFeatured.length + filteredUpcoming.length }),
    },
    {
      key: "recent" as const,
      label: t("tabRecent", { count: filteredRecent.length }),
    },
  ];

  const fights = tab === "upcoming" ? filteredUpcoming : filteredRecent;
  const hasActiveFilter = orgFilter !== "all" || q.trim() !== "";
  const chip =
    "rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-300";

  return (
    <div>
      <div className="mb-8 inline-flex rounded-full border border-line bg-panel p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={cn(
              "relative rounded-full px-5 py-2 text-sm font-medium transition-colors",
              tab === t.key ? "text-snow" : "text-mist hover:text-snow"
            )}
          >
            {tab === t.key && (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-0 rounded-full bg-neon/15 ring-1 ring-neon/50"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Filtres : organisation + recherche texte */}
      {orgs.length > 0 && (
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setOrgFilter("all");
                setQ("");
              }}
              className={cn(
                chip,
                !hasActiveFilter
                  ? "border-neon/60 bg-neon text-white shadow-neon-sm"
                  : "border-line bg-ink/60 text-mist hover:text-snow"
              )}
            >
              {t("orgAll")}
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

          <label className="ml-auto flex items-center gap-2 rounded-full border border-line bg-ink/60 px-4 py-2 text-sm text-mist focus-within:border-neon/50">
            <Search size={15} aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-40 bg-transparent text-snow placeholder:text-fog focus:outline-none sm:w-56"
            />
          </label>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
          {tab === "upcoming" && filteredFeatured.length > 0 && (
            <section className="mb-10">
              <p className="mb-4 flex items-center gap-2 font-display text-xs uppercase tracking-[0.3em] text-gold">
                <span aria-hidden>🏆</span> {t("featuredTitle")}
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredFeatured.map((fight, i) => (
                  <FightCard key={fight.id} fight={fight} index={i} />
                ))}
              </div>
            </section>
          )}

          {fights.length > 0 ? (
            <>
              {tab === "upcoming" && filteredFeatured.length > 0 && (
                <p className="mb-4 font-display text-xs uppercase tracking-[0.3em] text-fog">
                  {t("allFights")}
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {fights.map((fight, i) => (
                  <FightCard key={fight.id} fight={fight} index={i} />
                ))}
              </div>
            </>
          ) : hasActiveFilter ? (
            <p className="rounded-2xl border border-dashed border-line bg-panel/50 px-6 py-14 text-center text-sm text-mist">
              {t("noMatch")}
            </p>
          ) : (
            <p className="rounded-2xl border border-dashed border-line bg-panel/50 px-6 py-14 text-center text-sm text-mist">
              {tab === "upcoming" ? t("noneUpcoming") : t("noneRecent")}
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
