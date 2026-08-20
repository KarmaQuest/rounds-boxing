"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("errors");
  const tBoxeurs = useTranslations("boxeurs");

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neon-soft">
        {t("fighterUnavailable")}
      </p>
      <h1 className="font-display text-3xl uppercase tracking-wide text-snow">
        {t("fighterTitle")}
      </h1>
      <p className="text-sm text-mist">{t("fighterText")}</p>
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={reset}
          className="press btn-neon px-6 py-2.5"
        >
          {t("retry")}
        </button>
        <Link
          href="/boxeurs"
          className="inline-flex items-center gap-2 text-sm text-mist transition-colors hover:text-neon"
        >
          <ArrowLeft size={16} aria-hidden /> {tBoxeurs("backToDirectory")}
        </Link>
      </div>
      {process.env.NODE_ENV !== "production" && error.digest && (
        <p className="text-[11px] text-fog">digest : {error.digest}</p>
      )}
    </div>
  );
}