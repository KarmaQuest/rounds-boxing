"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const LETTERS = "ROUNDS".split("");

/**
 * Wipe page transition de gauche à droite.
 *
 * 1. Un panneau overlay glisse de gauche à droite, couvrant l'ancienne page
 * 2. Le titre "ROUNDS" + gant de boxe sont visibles au centre du panneau
 * 3. Le contenu change sous le panneau
 * 4. Le panneau continue vers la droite et révèle la nouvelle page
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const [phase, setPhase] = useState<"idle" | "wipe-in" | "wipe-out">("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (pathname === prevPathname.current) return;
    prevPathname.current = pathname;

    if (reduce) {
      return;
    }

    // Clear any pending timers
    timers.current.forEach(clearTimeout);
    timers.current = [];

    // Phase 1 : panneau slide de gauche à droite (couvre l'écran)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- effet de navigation (pathname), setState attendu
    setPhase("wipe-in");

    // Phase 2 : à 400ms, le contenu change
    timers.current.push(
      setTimeout(() => {
        // Phase 3 : à 500ms, le panneau continue vers la droite
        timers.current.push(
          setTimeout(() => {
            setPhase("wipe-out");

            // Phase 4 : idle
            timers.current.push(
              setTimeout(() => setPhase("idle"), 500)
            );
          }, 100)
        );
      }, 400)
    );

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [pathname, reduce]);

  return (
    <>
      {/* Contenu de la page */}
      <div>{children}</div>

      {/* Overlay wipe */}
      {!reduce && (
        <AnimatePresence>
          {phase !== "idle" && (
            <motion.div
              key="wipe-overlay"
              className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden bg-ink"
              initial={{ x: "-100%" }}
              animate={
                phase === "wipe-in"
                  ? { x: "0%" }
                  : { x: "100%" }
              }
              exit={{ x: "100%" }}
              transition={{
                duration: 0.45,
                ease: [0.76, 0, 0.24, 1],
              }}
            >
              {/* Titre ROUNDS + gant */}
              <div className="flex items-center gap-4">
                <span className="font-display text-6xl uppercase tracking-wide text-snow sm:text-8xl">
                  {LETTERS.map((l, i) => (
                    <span key={i} className={l === "S" ? "text-neon" : ""}>
                      {l}
                    </span>
                  ))}
                </span>
                {/* Gant de boxe SVG */}
                <svg
                  viewBox="0 0 64 64"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-14 w-14 sm:h-20 sm:w-20"
                  aria-hidden
                >
                  <path
                    d="M18 22c0-8 6-14 14-14s14 6 14 14v6c0 4-2 7-5 9l-2 14c-1 5-5 9-10 9h-4c-5 0-9-4-10-9l-2-14c-3-2-5-5-5-9v-6z"
                    fill="var(--color-neon)"
                    opacity="0.9"
                  />
                  <path
                    d="M18 26c-4 0-7-3-7-7s3-7 7-7"
                    stroke="var(--color-neon)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity="0.7"
                  />
                  <path
                    d="M26 12v12M32 10v14M38 12v12"
                    stroke="var(--color-ink)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    opacity="0.3"
                  />
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
              </div>

              {/* Ligne néon en bas */}
              <motion.div
                className="absolute bottom-0 left-0 h-[3px] w-full origin-left"
                style={{
                  background:
                    "linear-gradient(90deg, var(--color-neon) 0%, var(--color-gold) 100%)",
                }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </>
  );
}
