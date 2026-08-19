import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { addFavorite, isFavorite, removeFavorite } from "@/lib/auth/db";
import { jsonResponse } from "@/lib/api";

type Ctx = { params: Promise<{ slug: string }> };

/** PUT /api/favorites/[slug] — ajoute aux favoris. */
export async function PUT(_request: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser(_request);
  if (!user) {
    return jsonResponse({ error: "Non connecté", errorCode: "notConnected" }, { status: 401, cache: "no-store" });
  }
  const { slug } = await ctx.params;
  addFavorite(user.id, slug);
  return jsonResponse({ favorite: true, slug }, { cache: "no-store" });
}

/** DELETE /api/favorites/[slug] — retire des favoris. */
export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser(_request);
  if (!user) {
    return jsonResponse({ error: "Non connecté", errorCode: "notConnected" }, { status: 401, cache: "no-store" });
  }
  const { slug } = await ctx.params;
  removeFavorite(user.id, slug);
  return jsonResponse({ favorite: false, slug }, { cache: "no-store" });
}

/** GET /api/favorites/[slug] — état favori d'un boxeur (pour la carte). */
export async function GET(_request: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser(_request);
  if (!user) {
    return jsonResponse({ error: "Non connecté", errorCode: "notConnected" }, { status: 401, cache: "no-store" });
  }
  const { slug } = await ctx.params;
  return jsonResponse({ favorite: isFavorite(user.id, slug) }, { cache: "no-store" });
}
