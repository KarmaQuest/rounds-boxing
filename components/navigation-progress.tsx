"use client";

import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Barre de progression de navigation : une fine ligne néon en haut de l'écran
 * qui apparaît pendant les navigations SPA (pas sur les rechargements complets).
 *
 * - Se lance au changement de pathname
 * - Atteint ~70% rapidement, puis finit quand la page est prête
 * - Disparaît avec un fondu
 *
 * Respecte prefers-reduced-motion.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [navigating, setNavigating] = useState(false);
  const prevPathname = useRef(pathname);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const progress = useMotionValue(0);
  const smoothProgress = useSpring(progress, {
    damping: 30,
    stiffness: 400,
    mass: 0.5,
  });

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname;
      setNavigating(true);
      // Simulate progress: jump to 70%, then slowly approach 100%
      progress.set(0.7);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        progress.set(1);
        setTimeout(() => setNavigating(false), 400);
      }, 300);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname, progress]);

  if (reduce) return null;

  return (
    <AnimatePresence>
      {navigating && (
        <motion.div
          key="nav-progress"
          className="fixed inset-x-0 top-0 z-[90] h-[2px] origin-left"
          initial={{ opacity: 1, scaleX: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scaleX: 1, transition: { duration: 0.3 } }}
          style={{
            scaleX: smoothProgress,
            background:
              "linear-gradient(90deg, var(--color-neon) 0%, var(--color-gold) 100%)",
          }}
        />
      )}
    </AnimatePresence>
  );
}
