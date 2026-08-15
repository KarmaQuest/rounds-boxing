"use client";

/**
 * ErrorBoundary global (AUDIT P1 : plus d'écran blanc en cas d'erreur
 * runtime côté client). Bouton « Réessayer » → reset() relance le rendu.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neon-soft">
        Oups
      </p>
      <h1 className="font-display text-4xl uppercase tracking-wide text-snow">
        Une erreur est survenue
      </h1>
      <p className="text-sm text-mist">
        Quelque chose s’est mal passé pendant le chargement. Réessaie — si ça
        persiste, reviens un peu plus tard.
      </p>
      <button
        onClick={reset}
        className="press mt-2 rounded-full border border-neon/60 px-6 py-2.5 text-sm font-medium text-neon-soft transition-colors hover:bg-neon/10"
      >
        Réessayer
      </button>
      {process.env.NODE_ENV !== "production" && error.digest && (
        <p className="text-[11px] text-fog">digest : {error.digest}</p>
      )}
    </div>
  );
}
