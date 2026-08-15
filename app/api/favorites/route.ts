import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listFavoriteSlugs } from "@/lib/auth/db";
import { jsonResponse } from "@/lib/api";

/** GET /api/favorites — slugs favoris de l'utilisateur connecté (401 sinon). */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return jsonResponse({ error: "Non connecté" }, { status: 401, cache: "no-store" });
  }
  return jsonResponse({ slugs: listFavoriteSlugs(user.id) }, { cache: "no-store" });
}
