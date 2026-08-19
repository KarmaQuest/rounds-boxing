"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import type { BoxerRecord } from "@/lib/data/types";
import { koPct, totalFights } from "@/lib/data/utils";
import { cn } from "@/lib/utils";

interface RecordBarProps {
  record: BoxerRecord;
  className?: string;
}

/**
 * Barre horizontale V / D / N avec largeurs animées,
 * suivie d'une ligne KO % et du total de combats.
 */
export function RecordBar({ record, className }: RecordBarProps) {
  const t = useTranslations("common");
  const total = totalFights(record) || 1;
  const wPct = (record.wins / total) * 100;
  const lPct = (record.losses / total) * 100;
  const dPct = (record.draws / total) * 100;

  return (
    <div className={cn("w-full", className)}>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-line/60">
        <motion.div
          className="h-full bg-win"
          initial={{ width: 0 }}
          whileInView={{ width: `${wPct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.div
          className="h-full bg-loss"
          initial={{ width: 0 }}
          whileInView={{ width: `${lPct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.div
          className="h-full bg-draw"
          initial={{ width: 0 }}
          whileInView={{ width: `${dPct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] uppercase tracking-wider text-mist">
        <span>
          <span className="font-semibold text-win">{record.wins} {t("wins").charAt(0)}</span>
          {" · "}
          <span className="font-semibold text-loss">{record.losses} {t("losses").charAt(0)}</span>
          {" · "}
          <span className="font-semibold text-draw">{record.draws} {t("draws").charAt(0)}</span>
        </span>
        <span>
          {t("koPct", { pct: koPct(record) })} · {t("fightsCount", { count: total })}
        </span>
      </div>
    </div>
  );
}

/** Grands chiffres du palmarès (page profil). */
export function RecordNumbers({
  record,
  size = "md",
}: {
  record: BoxerRecord;
  size?: "md" | "lg";
}) {
  const t = useTranslations("common");
  const nums = [
    { label: t("wins"), value: record.wins, color: "text-win" },
    { label: t("losses"), value: record.losses, color: "text-loss" },
    { label: t("draws"), value: record.draws, color: "text-draw" },
    { label: t("byKo"), value: record.ko, color: "text-gold" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {nums.map((n, i) => (
        <motion.div
          key={n.label}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08, duration: 0.45 }}
          className="rounded-xl border border-line/60 bg-panel-2 px-2 py-3 text-center"
        >
          <p
            className={cn(
              "font-display leading-none",
              size === "lg" ? "text-4xl" : "text-3xl",
              n.color,
              n.color === "text-gold" && "text-glow-gold"
            )}
          >
            {n.value}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-fog">
            {n.label}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
