"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

const LINE_1 = "ROUNDS".split("");

/** Gant de boxe SVG inline (style outlined). */
function BoxingGlove({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Main glove body */}
      <path
        d="M18 22c0-8 6-14 14-14s14 6 14 14v6c0 4-2 7-5 9l-2 14c-1 5-5 9-10 9h-4c-5 0-9-4-10-9l-2-14c-3-2-5-5-5-9v-6z"
        fill="var(--color-neon)"
        opacity="0.9"
      />
      {/* Thumb */}
      <path
        d="M18 26c-4 0-7-3-7-7s3-7 7-7"
        stroke="var(--color-neon)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.7"
      />
      {/* Lacing lines */}
      <path
        d="M26 12v12M32 10v14M38 12v12"
        stroke="var(--color-ink)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.3"
      />
      {/* Wrist */}
      <rect
        x="22"
        y="52"
        width="20"
        height="6"
        rx="3"
        fill="var(--color-neon)"
        opacity="0.6"
      />
    </svg>
  );
}

/** Hero plein écran : anneaux néon animés + titre en cascade. */
export function Hero() {
  const t = useTranslations("home");

  return (
    <section className="relative flex min-h-[88vh] flex-col items-center justify-center overflow-hidden px-4">
      {/* fond quadrillé + vignette */}
      <div className="bg-grid absolute inset-0 opacity-60" />
      <div className="bg-vignette absolute inset-0" />

      {/* orbes néon animés */}
      <motion.div
        className="pointer-events-none absolute -left-32 top-24 h-96 w-96 rounded-full bg-neon/15 blur-3xl"
        animate={{ y: [0, -40, 0], x: [0, 30, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -right-32 bottom-24 h-96 w-96 rounded-full bg-gold/10 blur-3xl"
        animate={{ y: [0, 40, 0], x: [0, -30, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* anneaux de ring géants */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-line/50 sm:h-[700px] sm:w-[700px]" />
      <div className="animate-pulse-soft pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-neon/20 sm:h-[520px] sm:w-[520px]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-line/40 sm:h-[340px] sm:w-[340px]" />

      <div className="relative z-10 flex flex-col items-center text-center">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="mb-6 rounded-full border border-neon/40 bg-neon/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.35em] text-neon-soft"
        >
          {t("heroBadge")}
        </motion.p>

        <h1 className="font-display uppercase leading-[0.95] tracking-wide text-snow">
          <span className="flex items-center justify-center overflow-hidden text-6xl sm:text-8xl lg:text-9xl">
            {LINE_1.map((l, i) => (
              <motion.span
                key={i}
                className={`inline-block ${l === "S" ? "text-neon " : ""}`}
                initial={{ y: "110%" }}
                animate={{ y: 0 }}
                transition={{ delay: 0.25 + i * 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                {l}
              </motion.span>
            ))}
            <motion.span
              className="ml-3 inline-block sm:ml-4"
              initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.65, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <BoxingGlove className="h-[0.7em] w-[0.7em] sm:h-[0.8em] sm:w-[0.8em]" />
            </motion.span>
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.7 }}
          className="mt-6 max-w-xl text-base text-mist sm:text-lg"
        >
          {t("heroText")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.05, duration: 0.6 }}
          className="mt-9 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Link
            href="/boxeurs"
            className="sheen press group relative inline-flex h-13 items-center gap-2 overflow-hidden rounded-full bg-neon px-8 py-4 font-display text-sm uppercase tracking-[0.2em] text-white transition-all duration-300 hover:shadow-neon"
          >
            {t("explore")}
          </Link>
          <Link
            href="/combats"
            className="press inline-flex items-center gap-2 rounded-full border border-gold/50 px-8 py-4 font-display text-sm uppercase tracking-[0.2em] text-gold transition-all duration-300 hover:bg-gold/10 hover:shadow-gold"
          >
            {t("upcomingFights")}
          </Link>
        </motion.div>
      </div>

      {/* hint scroll */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-fog"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          <ChevronDown size={22} aria-hidden />
        </motion.div>
      </motion.div>
    </section>
  );
}
