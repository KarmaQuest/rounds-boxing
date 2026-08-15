"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <div className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-4 text-center">
      <div className="bg-grid absolute inset-0 opacity-40" />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <p className="font-display text-[7rem] uppercase leading-none text-neon text-glow-red sm:text-[10rem]">
          404
        </p>
        <p className="mt-2 font-display text-xl uppercase tracking-[0.3em] text-mist">
          Hors du ring
        </p>
        <p className="mx-auto mt-4 max-w-sm text-sm text-fog">
          Ce coin du ring n’existe pas (encore). Retourne à l’angle neutre.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center rounded-full bg-neon px-6 py-3 font-display text-sm uppercase tracking-[0.2em] text-white transition-all hover:shadow-neon"
        >
          Retour à l’accueil
        </Link>
      </motion.div>
    </div>
  );
}
