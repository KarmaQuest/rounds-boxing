/**
 * Sources d'actualités.
 *
 * Articles : flux RSS/Atom validés (avril 2026 — BoxingScene / BoxingNews24 /
 * The Ring sont derrière Cloudflare et répondent 403 aux bots, on les laisse
 * de côté ; les sources ci-dessous sont fiables et rapides).
 *
 * Vidéos : flux « videos.xml » public de YouTube (aucune clé API nécessaire),
 * par chaîne. IDs résolus via la page chaîne (channelId).
 */
export interface ArticleSource {
  id: string;
  name: string;
  url: string;
  /** true si le flux est en Atom (<entry>), false si RSS 2.0 (<item>). */
  atom: boolean;
}

export interface VideoSource {
  id: string;
  name: string;
  channelId: string;
}

export const ARTICLE_SOURCES: ArticleSource[] = [
  { id: "badlefthook", name: "Bad Left Hook", url: "https://www.badlefthook.com/rss/index.xml", atom: true },
  { id: "wbn", name: "World Boxing News", url: "https://www.worldboxingnews.net/feed/", atom: false },
  { id: "boxingnewsonline", name: "Boxing News Online", url: "https://boxingnewsonline.net/feed/", atom: false },
  { id: "boxingsocial", name: "Boxing Social", url: "https://boxing-social.com/feed/", atom: false },
  { id: "boxinginsider", name: "Boxing Insider", url: "https://www.boxinginsider.com/feed/", atom: false },
];

export const VIDEO_CHANNELS: VideoSource[] = [
  { id: "dazn", name: "DAZN Boxing", channelId: "UCQpbsCYqUl-KfJL_X_TDrHg" },
  { id: "toprank", name: "Top Rank", channelId: "UCbzRzJNHx7ZLlJML9BjZQVQ" },
  { id: "matchroom", name: "Matchroom", channelId: "UC7LReVje9aPB4B6XAsXX8WQ" },
  { id: "sky", name: "Sky Sports Boxing", channelId: "UC_JQGBtA7P0RwkRxd7xpJcA" },
  { id: "ifltv", name: "iFL TV", channelId: "UCHkKOloj_LQ4PKEySPJUY4w" },
];
