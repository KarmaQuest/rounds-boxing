/** Plateformes vidéo supportées par le lecteur embarqué (extensible). */
export type VideoPlatform = "youtube"; // | "vimeo" | "dailymotion" | …

/** Une actualité normalisée (article ou vidéo). */
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
  /** Miniature (vidéos uniquement). */
  thumbnail?: string;
  description?: string;
  /** Plateforme d'hébergement (vidéos) — pour le lecteur embarqué. */
  platform?: VideoPlatform;
  /** Identifiant vidéo chez la plateforme (lecteur embarqué). */
  videoId?: string;
}

export type NewsFilter = "all" | "articles" | "videos";

/** Requête de la page /actualites (pagination + filtres). */
export interface NewsQuery {
  type: NewsFilter;
  /** Recherche floue sur le titre (typos tolérées). */
  q?: string;
  /** Filtre par source (sourceId) : "" = toutes. */
  source?: string;
  /** Tri par date : "desc" (récent d'abord) ou "asc". */
  sort?: "asc" | "desc";
  offset: number;
  limit: number;
}

/** Réponse paginée. */
export interface NewsPage {
  items: NewsItem[];
  /** Nombre d'items APRÈS filtres (avant pagination). */
  total: number;
  hasMore: boolean;
  updatedAt: string;
}
