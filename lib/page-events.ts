/**
 * Événements globaux de chargement de page — petit bus d'événements
 * découplant « la page est prête » de « qui réagit à ça ».
 *
 * Flux :
 * 1. `PageReadySignal` (layout, client) émet `rounds:page-ready` quand
 *    window.load est atteint (toutes les ressources chargées) + un paint.
 * 2. Le `AppLoader` écoute cet événement pour lever le rideau — il a aussi
 *    un filet de sécurité (timer) pour ne jamais bloquer le site.
 *
 * D'autres composants peuvent s'abonner sans couplage (lancement d'animations,
 * compteurs…). Rien ne se passe si personne n'écoute (émission sans écouteur).
 */

export const PAGE_READY_EVENT = "rounds:page-ready";

/** Émet l'événement « page prête » (no-op côté serveur). */
export function dispatchPageReady(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PAGE_READY_EVENT));
}

/** S'abonne à « page prête ». Retourne la fonction de désabonnement. */
export function onPageReady(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener(PAGE_READY_EVENT, handler);
  return () => window.removeEventListener(PAGE_READY_EVENT, handler);
}
