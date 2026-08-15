"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

const WORD = "ROUNDS".split("");
const BANDS = 16;

/**
 * Loader d'introduction style eszterbial.com : un rideau de bandes
 * verticales tombe, le logo frappe lettre par lettre, puis les bandes
 * s'écartent (paires vers le haut, impaires vers le bas) pour révéler
 * la page.
 *
 * Rendu côté serveur (`visible = true` initial) : le rideau est dans le
 * HTML dès le premier paint, on ne voit JAMAIS le site avant lui. Le
 * layout serveur ne le rend que si le cookie `rounds_loader_seen` est
 * absent (retours sans flash) ; ici on pose le cookie + sessionStorage à
 * la fin de l'animation. Sauté en prefers-reduced-motion.
 */
export function AppLoader() {
  const [visible, setVisible] = useState(true);
  const [opening, setOpening] = useState(true);

  useEffect(() => {
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    // setState dans un callback (règle react-hooks/set-state-in-effect)
    timers.push(
      setTimeout(() => {
        // reduced-motion ou déjà vu dans cette session : on retire le
        // rideau immédiatement, sans animation
        if (
          window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
          sessionStorage.getItem("rounds-seen")
        ) {
          setVisible(false);
          return;
        }
        timers.push(setTimeout(() => setOpening(false), 1400));
        timers.push(
          setTimeout(() => {
            setVisible(false);
            sessionStorage.setItem("rounds-seen", "1");
            // ne plus rejouer le loader aux prochains chargements
            document.cookie =
              "rounds_loader_seen=1; path=/; max-age=31536000; samesite=lax";
          }, 2400)
        );
      }, 0)
    );
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="app-loader"
          className="fixed inset-0 z-[100] overflow-hidden bg-ink"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* rideau de bandes verticales */}
          <div className="absolute inset-0 flex h-full w-full" aria-hidden>
            {Array.from({ length: BANDS }).map((_, i) => (
              <motion.div
                key={i}
                className="h-full flex-1 border-r border-white/10"
                style={{
                  background:
                    i % 2 === 0
                      ? "linear-gradient(180deg, #0b0b14 0%, #07070c 100%)"
                      : "linear-gradient(180deg, #07070c 0%, #0d0d18 100%)",
                }}
                initial={{ y: "-110%" }}
                animate={
                  opening
                    ? { y: "0%" }
                    : { y: i % 2 === 0 ? "-120%" : "120%", opacity: 0.6 }
                }
                transition={
                  opening
                    ? {
                        delay: i * 0.025,
                        duration: 0.6,
                        ease: [0.22, 1, 0.36, 1],
                      }
                    : {
                        delay: i * 0.035,
                        duration: 0.7,
                        ease: [0.76, 0, 0.24, 1],
                      }
                }
              />
            ))}
          </div>

          {/* logo au centre : lettre par lettre, puis suit le rideau */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              className="relative mb-8 flex h-24 w-24 items-center justify-center"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0, y: -30, transition: { duration: 0.4 } }}
              transition={{ delay: 0.7, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              aria-hidden
            >
              <div className="absolute inset-0 rounded-full border-2 border-neon/40" />
              <div className="absolute inset-2 rounded-full border border-gold/40" />
              <motion.span
                className="text-4xl"
                animate={{ rotate: [0, -14, 10, 0] }}
                transition={{ delay: 0.8, duration: 0.7, ease: "easeOut" }}
              >
                🥊
              </motion.span>
            </motion.div>

            <div className="flex overflow-hidden font-display text-5xl uppercase tracking-[0.3em] text-snow sm:text-7xl">
              {WORD.map((letter, i) => (
                <motion.span
                  key={i}
                  initial={{ y: 90, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{
                    y: -90,
                    opacity: 0,
                    transition: {
                      delay: i * 0.04,
                      duration: 0.4,
                      ease: "easeIn",
                    },
                  }}
                  transition={{
                    delay: 0.75 + i * 0.08,
                    type: "spring",
                    stiffness: 260,
                    damping: 22,
                  }}
                  className={i === 5 ? "text-neon text-glow-red" : ""}
                >
                  {letter}
                </motion.span>
              ))}
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.3 } }}
              transition={{ delay: 1.15 }}
              className="mt-4 font-display text-sm uppercase tracking-[0.5em] text-mist"
            >
              Round 1 · Go
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
