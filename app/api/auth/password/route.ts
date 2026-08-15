import { NextRequest } from "next/server";
import { findUserById, updateUserPassword } from "@/lib/auth/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getCurrentUser } from "@/lib/auth/session";
import { jsonResponse } from "@/lib/api";

/**
 * PATCH /api/auth/password { oldPassword, newPassword }
 * Change le mot de passe de l'utilisateur connecté (ancien vérifié).
 */
export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return jsonResponse({ error: "Non connecté" }, { status: 401 });
  }

  let body: { oldPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const fresh = findUserById(user.id);
  if (!fresh || !verifyPassword(body.oldPassword ?? "", fresh.password_hash)) {
    return jsonResponse({ error: "Mot de passe actuel incorrect." }, { status: 400 });
  }
  if ((body.newPassword ?? "").length < 8) {
    return jsonResponse(
      { error: "Le nouveau mot de passe doit faire au moins 8 caractères." },
      { status: 400 }
    );
  }

  updateUserPassword(user.id, hashPassword(body.newPassword!));
  return jsonResponse({ ok: true });
}
