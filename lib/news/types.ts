/** Une actualité normalisée (article ou vidéo YouTube). */
export interface NewsItem {
  type: "article" | "video";
  /** Identifiant stable (url de l'item ou id vidéo). */
  id: string;
  title: string;
  url: string;
  /** Nom d'affichage de la source (chaîne YT ou site). */
  source: string;
  sourceId: string;
  /** Date de publication ISO 8601. */
  publishedAt: string;
  /** Miniature (vidéos YT uniquement). */
  thumbnail?: string;
  description?: string;
}

export type NewsFilter = "all" | "articles" | "videos";
