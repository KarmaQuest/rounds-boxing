import { NextRequest } from "next/server";
import { enforceRateLimit } from "@/lib/api";
import {
  resolveArticleThumb,
  thumbHash,
} from "@/lib/news/thumbnail";

/**
 * GET /api/news/thumb/:hash?url=… — miniature d'un article.
 *
 * Résout la miniature (cache disque → og:image de la page → génération IA)
 * et la sert avec un cache long : chaque article ne déclenche qu'une seule
 * résolution, le reste du temps c'est une lecture disque.
 *
 * - `hash` : clé de cache (sha1(sourceId:titre), 16 hex) — identifie la
 *   miniature, pas l'URL, pour rester stable entre deux polls de flux.
 * - `url` : URL de l'article, utilisée pour la récupération og:image.
 *
 * Rate-limited (comme les autres routes /api/*). Jamais de contenu
 * généré par l'IA si la clé/quota manque → 404, le client affiche son
 * fallback dégradé néon.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ hash: string }> }
) {
  const limited = enforceRateLimit(req);
  if (limited) return limited;

  const { hash } = await ctx.params;
  if (!/^[0-9a-f]{16}$/.test(hash)) {
    return new Response("Hash invalide.", { status: 400 });
  }

  const url = req.nextUrl.searchParams.get("url");
  if (!url || !/^https?:\/\//i.test(url)) {
    return new Response("Paramètre url manquant ou invalide.", { status: 400 });
  }

  const title = req.nextUrl.searchParams.get("title") ?? "";
  const description = req.nextUrl.searchParams.get("desc") ?? "";
  const source = req.nextUrl.searchParams.get("source") ?? "";

  // la clé de cache doit correspondre au couple sourceId:titre attendu
  // (calculé côté serveur dans lib/news/thumbnail.ts) — sinon 404.
  const expectedHash = thumbHash({ sourceId: source, title });
  if (hash !== expectedHash) {
    return new Response("Miniature introuvable.", { status: 404 });
  }

  const img = await resolveArticleThumb(hash, url, { title, description, source });

  if (!img) {
    return new Response("Aucune miniature disponible.", { status: 404 });
  }

  return new Response(new Uint8Array(img.data), {
    headers: {
      "Content-Type": img.type,
      "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
