"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

/**
 * Transition de page : fondu + léger décalage à l'ENTRÉE de chaque route
 * (key = pathname → la page est remontée et animée à chaque navigation).
 *
 * ⚠️ Volontairement SANS AnimatePresence : `mode="wait"` autour de contenu
 * RSC laissait la page à `opacity: 0` après navigation (page fantôme /
 * navigation bloquée). Une entrée seule donne la transition sans le bug.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
