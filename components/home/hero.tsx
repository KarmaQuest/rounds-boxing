"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

const LINE_1 = "ROUNDS".split("");

/** Hero plein écran : anneaux néon animés + titre en cascade. */
export function Hero() {
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
          L’univers de la boxe en un coup d’œil
        </motion.p>

        <h1 className="font-display uppercase leading-[0.95] tracking-wide text-snow">
          <span className="block overflow-hidden text-6xl sm:text-8xl lg:text-9xl">
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
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.7 }}
          className="mt-6 max-w-xl text-base text-mist sm:text-lg"
        >
          Palmarès, fiches techniques et combats des plus grands boxeurs du
          monde. Filtres ultra-rapides, données multi-sources et animations.
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
            Explorer les boxeurs
          </Link>
          <Link
            href="/combats"
            className="press inline-flex items-center gap-2 rounded-full border border-gold/50 px-8 py-4 font-display text-sm uppercase tracking-[0.2em] text-gold transition-all duration-300 hover:bg-gold/10 hover:shadow-gold"
          >
            Combats à venir
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
