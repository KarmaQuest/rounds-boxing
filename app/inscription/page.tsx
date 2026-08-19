import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.inscription");
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/inscription" },
  };
}

export default async function InscriptionPage() {
  const t = await getTranslations("auth");
  const tCommon = await getTranslations("common");

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16 sm:py-24">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neon-soft">
          {t("account")}
        </p>
        <h1 className="mt-2 font-display text-4xl uppercase tracking-wide text-snow">
          {t("registerTitle")}
        </h1>
        <p className="mt-3 text-sm text-mist">{t("registerText")}</p>
      </div>
      <Suspense fallback={<p className="text-center text-sm text-fog">{tCommon("loading")}</p>}>
        <AuthForm mode="register" />
      </Suspense>
    </div>
  );
}