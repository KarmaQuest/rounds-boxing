import type { MetadataRoute } from "next";
import { searchBoxeurs } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

/**
 * sitemap.xml — pages statiques + un URL par profil boxeur.
 * Caché par défaut (généré à la build) ; les profils viennent de la couche
 * données (Big Balls + mock), déjà mise en cache TTL.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { fighters } = await searchBoxeurs({ limit: 500 });

  const fighterUrls: MetadataRoute.Sitemap = fighters.map((f) => ({
    url: `${SITE_URL}/boxeurs/${f.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/boxeurs`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/combats`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/actualites`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.7,
    },
    ...fighterUrls,
  ];
}
