"use client";

import { useLocale } from "next-intl";
import { toLocale } from "@/lib/i18n/data";
import type { Locale } from "@/i18n/routing";

/**
 * Hook qui retourne le locale formaté pour l'app (fr → 'fr', en → 'en').
 * Remplace le pattern `toLocale(useLocale())` répété dans 15+ composants.
 */
export function useFormattedLocale(): Locale {
  return toLocale(useLocale());
}
