"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { onPageReady } from "@/lib/page-events";

const WORD = "ROUNDS".split("");
const BANDS = 16;

/**
 * Loader d'introduction style eszterbial.com : un rideau de bandes
 * verticales tombe, le logo frappe lettre par lettre, puis les bandes
 * s'écartent (paires vers le haut, impaires vers le bas) pour révéler
 * la page.
 *
 * Rendu côté serveur (`visible = true` initial) : le rideau est dans le
 * HTML dès le premier paint — le site ne s'affiche qu'une fois le rideau
 * parti. Sauté en prefers-reduced-motion.
 *
 * NE SE JOUE QUE sur les vrais chargements de page (F5, nouvel onglet) :
 * la révélation est déclenchée par l'événement `rounds:page-ready` émis par
 * `PageReadySignal` au moment de window.load (tout est chargé), avec un
 * temps minimal d'affichage du logo et un filet de sécurité. Les
 * navigations internes (SPA) n'ont PAS de rideau : elles utilisent le fade
 * de `PageTransition`.
 */
export function AppLoader() {
  const [visible, setVisible] = useState(true);
  const [opening, setOpening] = useState(true);
  const lifted = useRef(false);

  /** Lève le rideau (une seule fois) puis le démonte. */
  const lift = useCallback(() => {
    if (lifted.current) return;
    lifted.current = true;
    setOpening(false);
    // laisse les bandes se lever avant de démonter le rideau
    setTimeout(() => setVisible(false), 800);
  }, []);

  useEffect(() => {
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    let unsubscribe: (() => void) | undefined;
    // setState dans des callbacks (règle react-hooks/set-state-in-effect)
    timers.push(
      setTimeout(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          setVisible(false);
          return;
        }
        // temps minimal d'affichage du logo avant la révélation
        const minDisplayAt = Date.now() + 1500;
        unsubscribe = onPageReady(() => {
          const wait = Math.max(0, minDisplayAt - Date.now());
          timers.push(setTimeout(lift, wait));
        });
        // filet de sécurité : on ne bloque jamais le site plus de 6 s
        timers.push(setTimeout(lift, 6000));
      }, 0)
    );
    return () => {
      unsubscribe?.();
      timers.forEach((t) => clearTimeout(t));
    };
  }, [lift]);

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
