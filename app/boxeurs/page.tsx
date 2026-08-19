import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { FighterGridSkeleton } from "@/components/skeleton";

// Code-splitting : le répertoire (lourd : framer-motion + React Query)
// n'est chargé que quand on arrive sur la page (AUDIT §2 P2).
const Directory = dynamic(
  () => import("@/components/directory/directory").then((m) => m.Directory),
  { loading: () => <FighterGridSkeleton count={8} /> }
);

/** Paramètres de filtre du répertoire (synchronisés dans l'URL). */
const FILTER_KEYS = ["q", "cat", "pays", "v", "ko", "tri"] as const;

/**
 * Les URL avec filtres sont des variantes de la même page → noindex (mais
 * la page de base reste indexable). Lecture de searchParams = rendu dynamique
 * pour cette route uniquement.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const t = await getTranslations("meta.boxeurs");
  const sp = await searchParams;
  const hasFilters = FILTER_KEYS.some((key) => {
    const v = sp[key];
    return v !== undefined && (typeof v === "string" ? v.trim() !== "" : true);
  });

  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/boxeurs" },
    robots: hasFilters ? { index: false, follow: true } : undefined,
  };
}

export default async function BoxeursPage() {
  const t = await getTranslations("boxeurs");

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neon-soft">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 font-display text-4xl uppercase tracking-wide text-snow sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-3 max-w-xl text-sm text-mist">{t("text")}</p>
      </div>

      <Suspense fallback={<FighterGridSkeleton count={8} />}>
        <Directory />
      </Suspense>
    </div>
  );
}