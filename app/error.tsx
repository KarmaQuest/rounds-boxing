"use client";

import { useTranslations } from "next-intl";

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
  const t = useTranslations("errors");

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neon-soft">
        {t("oops")}
      </p>
      <h1 className="font-display text-4xl uppercase tracking-wide text-snow">
        {t("globalTitle")}
      </h1>
      <p className="text-sm text-mist">{t("globalText")}</p>
      <button
        onClick={reset}
        className="press mt-2 rounded-full border border-neon/60 px-6 py-2.5 text-sm font-medium text-neon-soft transition-colors hover:bg-neon/10"
      >
        {t("retry")}
      </button>
      {process.env.NODE_ENV !== "production" && error.digest && (
        <p className="text-[11px] text-fog">digest : {error.digest}</p>
      )}
    </div>
  );
}
