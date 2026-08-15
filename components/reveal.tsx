"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** délai en secondes */
  delay?: number;
  /** direction d'entrée */
  from?: "up" | "down" | "left" | "right" | "none";
  className?: string;
  once?: boolean;
}

/**
 * Révèle son contenu avec un léger fondu + translation quand il entre
 * dans le viewport. Respecte prefers-reduced-motion.
 */
export function Reveal({
  children,
  delay = 0,
  from = "up",
  className,
  once = true,
}: RevealProps) {
  const reduce = useReducedMotion();

  const offset: Record<string, { x: number; y: number }> = {
    up: { x: 0, y: 28 },
    down: { x: 0, y: -28 },
    left: { x: 28, y: 0 },
    right: { x: -28, y: 0 },
    none: { x: 0, y: 0 },
  };

  return (
    <motion.div
      className={className}
      initial={
        reduce
          ? { opacity: 0 }
          : { opacity: 0, x: offset[from].x, y: offset[from].y }
      }
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Révélation avec décalage en cascade (cartes de grille). */
export function staggerParent(step = 0.06) {
  return {
    hidden: {},
    show: { transition: { staggerChildren: step } },
  };
}

export const staggerChild = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};
