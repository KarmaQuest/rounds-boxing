import { NextRequest } from "next/server";
import { enforceRateLimit } from "@/lib/api";
import {
  PROXY_IMAGE_HOSTS,
  fetchProxiedImage,
} from "@/lib/news/img-proxy";

/**
 * GET /api/img?url=… — proxy des vignettes protégées anti-hotlink.
 * L'allowlist d'hôtes empêche d'en faire un open proxy.
 */
export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req);
  if (limited) return limited;

  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) {
    return new Response("Paramètre url manquant.", { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response("URL invalide.", { status: 400 });
  }

  if (target.protocol !== "https:" || !PROXY_IMAGE_HOSTS.has(target.hostname)) {
    return new Response("Hôte non autorisé.", { status: 403 });
  }

  const img = await fetchProxiedImage(target.href);
  if (!img) {
    return new Response("Image introuvable.", { status: 404 });
  }

  return new Response(new Uint8Array(img.data), {
    headers: {
      "Content-Type": img.type,
      // le navigateur garde la vignette 6 h — une seule requête par image
      "Cache-Control": "public, max-age=21600, s-maxage=21600, immutable",
      "Content-Length": String(img.data.length),
    },
  });
}
