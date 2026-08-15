"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/**
 * ErrorBoundary du profil boxeur (AUDIT P1) : fallback stylé + retry,
 * sans casser le 404 (pas de loading.tsx sur cette route).
 */
export default function FighterError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neon-soft">
        Profil indisponible
      </p>
      <h1 className="font-display text-3xl uppercase tracking-wide text-snow">
        Impossible de charger ce boxeur
      </h1>
      <p className="text-sm text-mist">
        Une erreur est survenue pendant le chargement du profil.
      </p>
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={reset}
          className="press rounded-full border border-neon/60 px-6 py-2.5 text-sm font-medium text-neon-soft transition-colors hover:bg-neon/10"
        >
          Réessayer
        </button>
        <Link
          href="/boxeurs"
          className="inline-flex items-center gap-2 text-sm text-mist transition-colors hover:text-neon"
        >
          <ArrowLeft size={16} aria-hidden /> Retour au répertoire
        </Link>
      </div>
      {process.env.NODE_ENV !== "production" && error.digest && (
        <p className="text-[11px] text-fog">digest : {error.digest}</p>
      )}
    </div>
  );
}
