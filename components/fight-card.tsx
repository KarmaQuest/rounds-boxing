"use client";

import { motion } from "framer-motion";
import { CalendarDays, MapPin } from "lucide-react";
import type { Fight } from "@/lib/data/types";
import { formatDate, formatOdds } from "@/lib/utils";
import { cn } from "@/lib/utils";

function FighterSide({
  side,
  name,
  flag,
  odds,
  isWinner,
}: {
  side: "a" | "b";
  name: string;
  flag?: string;
  odds?: number;
  isWinner?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2 text-center">
      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full border text-lg transition-transform",
          side === "a" ? "border-neon/50 bg-neon/10" : "border-gold/50 bg-gold/10",
          isWinner && "scale-110 shadow-gold"
        )}
      >
        {flag ?? "🥊"}
      </div>
      <p className="max-w-[10rem] truncate text-sm font-semibold text-snow">{name}</p>
      {odds && (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-bold",
            side === "a" ? "bg-neon/15 text-neon-soft" : "bg-gold/15 text-gold"
          )}
        >
          {formatOdds(odds)}
        </span>
      )}
      {isWinner && (
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gold">
          Vainqueur
        </span>
      )}
    </div>
  );
}

interface FightCardProps {
  fight: Fight;
  index?: number;
}

/** Carte combat : deux boxeurs face à face, cotes ou résultat. */
export function FightCard({ fight, index = 0 }: FightCardProps) {
  const [a, b] = fight.fighters;
  const upcoming = fight.status === "upcoming";
  const winnerIdx = fight.outcome?.winnerIndex;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.4) }}
      layout
    >
      <div className="group relative overflow-hidden rounded-2xl border border-line/60 bg-panel p-6 transition-all duration-300 panel-glow hover:-translate-y-1 hover:border-gold/50 hover:shadow-gold">
        {/* bandeau "VS" */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04]">
          <span className="font-display text-[10rem] uppercase text-snow">VS</span>
        </div>

        {fight.title && (
          <p className="mb-4 flex items-center justify-center gap-2 text-center text-xs font-semibold uppercase tracking-wider text-gold">
            <span>🏆</span> {fight.title}
          </p>
        )}

        <div className="relative flex items-center gap-3">
          <FighterSide
            side="a"
            name={a.name}
            flag={a.flag}
            odds={upcoming ? fight.odds?.[0] : undefined}
            isWinner={!upcoming && winnerIdx === 0}
          />

          <div className="flex flex-col items-center gap-1 px-1">
            <span className="font-display text-sm uppercase tracking-widest text-mist">
              {upcoming ? "VS" : ""}
            </span>
            {!upcoming && fight.outcome && (
              <span className="text-center text-[10px] font-bold uppercase leading-tight text-snow">
                {fight.outcome.method}
                {fight.outcome.round ? ` R${fight.outcome.round}` : ""}
              </span>
            )}
          </div>

          <FighterSide
            side="b"
            name={b.name}
            flag={b.flag}
            odds={upcoming ? fight.odds?.[1] : undefined}
            isWinner={!upcoming && winnerIdx === 1}
          />
        </div>

        <div className="relative mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-fog">
          <span className="flex items-center gap-1">
            <CalendarDays size={12} aria-hidden /> {formatDate(fight.date)}
          </span>
          {fight.location && (
            <span className="flex items-center gap-1">
              <MapPin size={12} aria-hidden /> {fight.location}
            </span>
          )}
          {fight.weightClass && <span>{fight.weightClass}</span>}
        </div>
      </div>
    </motion.div>
  );
}
