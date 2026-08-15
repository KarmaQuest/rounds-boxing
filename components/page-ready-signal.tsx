"use client";

import { useEffect } from "react";
import { dispatchPageReady } from "@/lib/page-events";

/**
 * Source de l'événement « page prête » : émet `rounds:page-ready` dès que
 * window.load est atteint (HTML + styles + polices + images non-lazy) et
 * qu'un frame a été peint. Rend null (aucun DOM).
 *
 * Ne re-émet pas sur les navigations internes (SPA) : le loader ne se joue
 * que sur les vrais chargements (F5 / nouvel onglet) ; les navigations
 * internes utilisent la transition de fade de `PageTransition`.
 */
export function PageReadySignal() {
  useEffect(() => {
    const announce = () =>
      requestAnimationFrame(() => dispatchPageReady());

    if (document.readyState === "complete") {
      announce();
    } else {
      window.addEventListener("load", announce, { once: true });
    }
  }, []);

  return null;
}
