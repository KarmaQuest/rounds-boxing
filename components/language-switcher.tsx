"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = { fr: "FR", en: "EN" };

const COOKIE_MAX_AGE = 31536000;

/** Écrit le cookie de locale hors du composant (évite la règle immutability). */
function setLocaleCookie(next: string) {
  document.cookie = `NEXT_LOCALE=${next};path=/;max-age=${COOKIE_MAX_AGE};samesite=lax`;
}

/**
 * Sélecteur de langue FR / EN. Pose le cookie `NEXT_LOCALE` puis rafraîchit
 * la page : la locale est résolue par requête (i18n/request.ts), les URLs
 * restent inchangées.
 */
export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("lang");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const switchTo = (next: string) => {
    if (next === locale || isPending) return;
    setLocaleCookie(next);
    startTransition(() => router.refresh());
  };

  return (
    <div
      role="group"
      aria-label={t("label")}
      className="hidden items-center gap-0.5 rounded-full border border-line bg-panel p-0.5 sm:flex"
    >
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          aria-pressed={locale === l}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider transition-colors",
            locale === l
              ? "bg-neon text-white shadow-neon-sm"
              : "text-mist hover:text-snow"
          )}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}