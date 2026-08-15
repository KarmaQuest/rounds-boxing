/**
 * URL publique du site, utilisée par le sitemap, robots.txt, les canonicals
 * et les OG images. À renseigner au moment du déploiement
 * (NEXT_PUBLIC_SITE_URL=https://…). Sans valeur, on reste en localhost.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");
