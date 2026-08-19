import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { routing } from "./routing";

/**
 * Résolution de la locale par requête, SANS middleware (URLs inchangées) :
 * 1. cookie `NEXT_LOCALE` (posé par le sélecteur de langue) — en premier,
 *    car avec `localePrefix: "never"`, `requestLocale` renvoie toujours la
 *    locale par défaut et masquerait le choix explicite de l'utilisateur ;
 * 2. sinon `requestLocale` (segment/défaut) ;
 * 3. sinon détection `Accept-Language` ;
 * 4. sinon `fr` (locale par défaut).
 *
 * La lecture de cookie/headers rend les pages dynamiques (assumé pour ce site).
 */
export default getRequestConfig(async ({ requestLocale }) => {
  let locale: string | undefined;

  const cookie = (await cookies()).get("NEXT_LOCALE")?.value;
  if (hasLocale(routing.locales, cookie)) {
    locale = cookie;
  }

  if (!locale) {
    const requested = await requestLocale;
    if (hasLocale(routing.locales, requested)) {
      locale = requested;
    }
  }

  if (!locale) {
    const accept = (await headers()).get("accept-language") ?? "";
    const detected = accept.toLowerCase().match(/(?:^|,)\s*(fr|en)\b/)?.[1];
    if (hasLocale(routing.locales, detected)) {
      locale = detected;
    }
  }

  locale = locale ?? routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
