"use client";

import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface CounterProps {
  to: number;
  duration?: number;
  className?: string;
  /** suffixe affiché après le nombre */
  suffix?: string;
}

/** Anime un nombre de 0 → `to` quand il entre dans le viewport. */
export function Counter({ to, duration = 1.4, className, suffix = "" }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    // prefers-reduced-motion : on saute l’animation en gardant le même chemin
    // de code (le setState a lieu dans le callback d’animation, jamais en
    // synchrone dans l’effet).
    const controls = animate(0, to, {
      duration: reduce ? 0 : duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, to, duration, reduce]);

  return (
    <span ref={ref} className={className}>
      {value.toLocaleString("fr-FR")}
      {suffix}
    </span>
  );
}
