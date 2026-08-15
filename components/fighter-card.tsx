"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Crown, TrendingUp } from "lucide-react";
import type { Fighter } from "@/lib/data/types";
import { koPct } from "@/lib/data/utils";
import { Avatar } from "./avatar";
import { RecordBar } from "./record-bar";

interface FighterCardProps {
  fighter: Fighter;
  index?: number;
}

/** Carte boxeur : avatar, nom, catégorie, palmarès + barre animée. */
export function FighterCard({ fighter, index = 0 }: FighterCardProps) {
  const ko = koPct(fighter.record);
  const total = fighter.record.wins + fighter.record.losses + fighter.record.draws;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.5) }}
      layout
    >
      <Link
        href={`/boxeurs/${fighter.slug}`}
        className="group relative block overflow-hidden rounded-2xl border border-line/60 bg-panel p-5 transition-all duration-300 panel-glow hover:-translate-y-1 hover:border-neon/60 hover:shadow-neon"
      >
        {/* halo néon au survol */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-neon/0 blur-3xl transition-all duration-500 group-hover:bg-neon/20" />

        {fighter.rank ? (
          <div
            className={`absolute right-3 top-3 flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
              fighter.rank <= 5
                ? "border-gold/40 bg-gold/10 text-gold"
                : "border-line bg-panel-2 text-fog"
            }`}
          >
            {fighter.rank <= 5 && <Crown size={11} aria-hidden />}
            Top {fighter.rank}
          </div>
        ) : null}

        <div className="flex items-center gap-4">
          <Avatar name={fighter.name} size="md" className="transition-transform duration-300 group-hover:scale-105" />
          <div className="min-w-0">
            <h3 className="truncate font-display text-lg uppercase leading-tight tracking-wide text-snow">
              {fighter.name}
            </h3>
            {fighter.nickname && (
              <p className="truncate text-xs italic text-mist">« {fighter.nickname} »</p>
            )}
            <p className="mt-1 flex items-center gap-1.5 text-xs text-fog">
              <span>{fighter.flag}</span>
              <span>{fighter.country}</span>
              <span className="text-line">•</span>
              <span>{fighter.weightClass}</span>
            </p>
          </div>
        </div>

        {total === 0 ? (
          <div className="mt-5">
            <span className="inline-flex items-center rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold">
              Palmarès à venir
            </span>
          </div>
        ) : (
          <div className="mt-5">
            <div className="mb-2 flex items-baseline justify-between">
              <p className="font-display text-2xl tracking-wide text-snow">
                {fighter.record.wins}
                <span className="text-loss">-{fighter.record.losses}</span>
                <span className="text-draw">-{fighter.record.draws}</span>
              </p>
              <p className="flex items-center gap-1 text-xs text-gold">
                <TrendingUp size={12} aria-hidden /> {ko}% KO
              </p>
            </div>
            <RecordBar record={fighter.record} />
          </div>
        )}
      </Link>
    </motion.div>
  );
}
