"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Fight } from "@/lib/data/types";
import { FightCard } from "@/components/fight-card";
import { cn } from "@/lib/utils";

interface TabsProps {
  /** affiches « du moment » (grosses cartes) — TASKS 1.4 */
  featured: Fight[];
  /** autres combats à venir */
  upcoming: Fight[];
  recent: Fight[];
}

/** Onglets simples avec indicateur animé. */
export function FightTabs({ featured, upcoming, recent }: TabsProps) {
  const [tab, setTab] = useState<"upcoming" | "recent">("upcoming");

  const tabs = [
    { key: "upcoming" as const, label: `À venir (${upcoming.length + featured.length})` },
    { key: "recent" as const, label: `Résultats récents (${recent.length})` },
  ];

  const fights = tab === "upcoming" ? upcoming : recent;

  return (
    <div>
      <div className="mb-8 inline-flex rounded-full border border-line bg-panel p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
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

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
          {tab === "upcoming" && featured.length > 0 && (
            <section className="mb-10">
              <p className="mb-4 flex items-center gap-2 font-display text-xs uppercase tracking-[0.3em] text-gold">
                <span aria-hidden>🏆</span> Les affiches du moment
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((fight, i) => (
                  <FightCard key={fight.id} fight={fight} index={i} />
                ))}
              </div>
            </section>
          )}

          {fights.length > 0 && (
            <>
              {tab === "upcoming" && featured.length > 0 && (
                <p className="mb-4 font-display text-xs uppercase tracking-[0.3em] text-fog">
                  Toutes les affiches
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {fights.map((fight, i) => (
                  <FightCard key={fight.id} fight={fight} index={i} />
                ))}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {tab === "upcoming" && fights.length === 0 && featured.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line bg-panel/50 px-6 py-14 text-center text-sm text-mist">
          Aucun combat pour le moment.
        </p>
      )}
      {tab === "recent" && fights.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line bg-panel/50 px-6 py-14 text-center text-sm text-mist">
          Aucun résultat pour le moment.
        </p>
      )}
    </div>
  );
}
