import type { MetadataRoute } from "next";

/** Manifest PWA : rend le site installable (TASKS 3.6). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ROUNDS — Les records de la boxe",
    short_name: "ROUNDS",
    description:
      "Palmarès, profils et combats des plus grands boxeurs du monde.",
    start_url: "/",
    display: "standalone",
    background_color: "#07070c",
    theme_color: "#07070c",
    lang: "fr",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
