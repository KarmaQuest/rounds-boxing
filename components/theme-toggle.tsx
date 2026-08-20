"use client";

import { motion } from "framer-motion";
import { useTheme } from "@/components/theme-provider";
import { IconButton } from "@/components/ui/icon-btn";

/**
 * Bouton thème dark ↔ light avec icône soleil/lune animée.
 * - Lune → Soleil (mode light)
 * - Soleil → Lune (mode dark)
 */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isLight = theme === "light";

  return (
    <IconButton
      onClick={toggle}
      aria-label={isLight ? "Passer en mode sombre" : "Passer en mode clair"}
    >
      <motion.svg
        key={theme}
        initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-snow"
      >
        {isLight ? (
          <>
            {/* Lune (mode dark) */}
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </>
        ) : (
          <>
            {/* Soleil (mode light) */}
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </>
        )}
      </motion.svg>
    </IconButton>
  );
}
