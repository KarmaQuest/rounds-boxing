import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NewsSection } from "@/components/home/news";
import { JsonLd } from "@/components/json-ld";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.actualite");
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/actualite" },
  };
}

export default async function ActualitePage() {
  const t = await getTranslations("actualites");

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: t("ldName"),
          description: t("ldDescription"),
        }}
      />

      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neon-soft">
          {t("badge")}
        </p>
        <h1 className="mt-2 font-display text-4xl uppercase tracking-wide text-snow sm:text-5xl">
          {t.rich("title", {
            b: (chunks) => <span className="text-neon text-glow-red">{chunks}</span>,
          })}
        </h1>
        <p className="mt-3 max-w-xl text-sm text-mist">{t("text")}</p>
      </div>

      <NewsSection header={false} pageSize={12} pagination />
    </div>
  );
}