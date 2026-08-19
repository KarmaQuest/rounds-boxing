import { defineRouting } from "next-intl/routing";

/**
 * Configuration i18n partagée. `localePrefix: "never"` → aucune locale dans
 * l'URL (choix assumé : les URLs ne changent pas, la langue est portée par le
 * cookie `NEXT_LOCALE`, avec détection Accept-Language au premier passage).
 */
export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  localePrefix: "never",
});

export type Locale = (typeof routing.locales)[number];
