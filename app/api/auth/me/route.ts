import { NextRequest } from "next/server";
import { getCurrentUser, publicUser } from "@/lib/auth/session";
import { jsonResponse } from "@/lib/api";

/** GET /api/auth/me — utilisateur connecté, ou 401. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return jsonResponse({ error: "Non connecté" }, { status: 401, cache: "no-store" });
  }
  return jsonResponse({ user: publicUser(user) }, { cache: "no-store" });
}
