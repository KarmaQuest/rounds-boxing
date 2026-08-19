import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Comparateur } from "@/components/comparateur/comparator";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.comparateur");
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/comparateur" },
  };
}

export default async function ComparateurPage() {
  const t = await getTranslations("comparateur");

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 font-display text-4xl uppercase tracking-wide text-snow sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-3 max-w-xl text-sm text-mist">{t("text")}</p>
      </div>

      <Suspense
        fallback={
          <p className="text-center text-sm text-fog">{t("loading")}</p>
        }
      >
        <Comparateur />
      </Suspense>
    </div>
  );
}