"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { CalendarDays, MapPin } from "lucide-react";
import type { Fight } from "@/lib/data/types";
import { formatDate, formatOdds } from "@/lib/utils";
import { slugify } from "@/lib/data/utils";
import { methodLabel, toLocale, weightClassLabel } from "@/lib/i18n/data";
import { cn } from "@/lib/utils";

function FighterSide({
  side,
  name,
  flag,
  odds,
  isWinner,
  winnerLabel,
}: {
  side: "a" | "b";
  name: string;
  flag?: string;
  odds?: number;
  isWinner?: boolean;
  winnerLabel?: string;
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
          {winnerLabel}
        </span>
      )}
    </div>
  );
}

/** Slug d'organisation (source des shards du pipeline) → libellé affiché. */
const ORG_LABELS: Record<string, string> = {
  ibf: "IBF",
  wba: "WBA",
  wbc: "WBC",
  wbo: "WBO",
  csac: "CSAC",
  nsac: "NSAC",
  ffboxe: "FFBoxe",
  "ffboxe-amateur": "FFBoxe Amateur",
};

/** Badge discret indiquant l'organisation officielle qui a publié le résultat. */
function OrgBadge({ source, title }: { source?: string; title?: string }) {
  const label = source ? ORG_LABELS[source] : undefined;
  if (!label) return null;
  return (
    <span
      title={title}
      className="rounded-full border border-line/60 bg-panel-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-mist"
    >
      {label}
    </span>
  );
}

interface FightCardProps {
  fight: Fight;
  index?: number;
}

/** Carte combat : deux boxeurs face à face, cotes ou résultat.
 *  Cliquable → comparateur des deux boxeurs (tale of the tape). */
export function FightCard({ fight, index = 0 }: FightCardProps) {
  const t = useTranslations("fights");
  const locale = toLocale(useLocale());
  const [a, b] = fight.fighters;
  const upcoming = fight.status === "upcoming";
  const winnerIdx = fight.outcome?.winnerIndex;
  const compareHref = `/comparateur?boxeurA=${slugify(a.name)}&boxeurB=${slugify(b.name)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.4) }}
      layout
    >
      <Link
        href={compareHref}
        className="group relative block overflow-hidden rounded-2xl border border-line/60 bg-panel p-6 transition-all duration-300 panel-glow hover:-translate-y-1 hover:border-gold/50 hover:shadow-gold"
      >
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
            winnerLabel={t("winner")}
          />

          <div className="flex flex-col items-center gap-1 px-1">
            <span className="font-display text-sm uppercase tracking-widest text-mist">
              {upcoming ? "VS" : ""}
            </span>
            {!upcoming && fight.outcome && (
              <span className="text-center text-[10px] font-bold uppercase leading-tight text-snow">
                {methodLabel(fight.outcome.method, locale)}
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
            winnerLabel={t("winner")}
          />
        </div>

        <div className="relative mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-fog">
          <span className="flex items-center gap-1">
            <CalendarDays size={12} aria-hidden /> {formatDate(fight.date, {}, locale === "en" ? "en-US" : "fr-FR")}
          </span>
          {fight.location && (
            <span className="flex items-center gap-1">
              <MapPin size={12} aria-hidden /> {fight.location}
            </span>
          )}
          {fight.weightClass && <span>{weightClassLabel(fight.weightClass, locale)}</span>}
          <OrgBadge source={fight.source} title={t("orgPublished")} />
          {fight.amateur && (
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Amateur
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}