import type { MetadataRoute } from "next";
import { cookies } from "next/headers";
import { toLocale } from "@/lib/i18n/data";

/** Manifest PWA : rend le site installable (TASKS 3.6). */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const locale = toLocale((await cookies()).get("NEXT_LOCALE")?.value);

  return {
    name: locale === "en" ? "ROUNDS — Boxing records" : "ROUNDS — Les records de la boxe",
    short_name: "ROUNDS",
    description:
      locale === "en"
        ? "Records, profiles and fights of the greatest boxers in the world."
        : "Palmarès, profils et combats des plus grands boxeurs du monde.",
    start_url: "/",
    display: "standalone",
    background_color: "#07070c",
    theme_color: "#07070c",
    lang: locale,
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}