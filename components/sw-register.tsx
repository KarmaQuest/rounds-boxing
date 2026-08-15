"use client";

import { useEffect } from "react";

/**
 * Enregistre le service worker (PWA) — uniquement en production pour ne
 * jamais mettre en cache des pages pendant le développement/les tests.
 */
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // silencieux : la PWA reste un bonus, pas un prérequis
    });
  }, []);

  return null;
}
