/** Fusionne les classes Tailwind (évite une dépendance clsx/tailwind-merge). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Formate une date ISO dans la locale donnée (défaut : français). */
export function formatDate(
  iso: string,
  opts: Intl.DateTimeFormatOptions = {},
  locale: string = "fr-FR"
): string {
  try {
    return new Date(iso).toLocaleDateString(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
      ...opts,
    });
  } catch {
    return iso;
  }
}

/** Formate une cote décimale. */
export function formatOdds(odds: number): string {
  return odds.toFixed(2);
}

/** Formate une taille en cm. */
export function formatCm(cm: number): string {
  return cm > 0 ? `${cm} cm` : "—";
}
