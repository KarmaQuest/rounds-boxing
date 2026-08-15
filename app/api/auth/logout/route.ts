import { SESSION_COOKIE } from "@/lib/auth/constants";
import { jsonResponse } from "@/lib/api";

export async function POST() {
  const res = jsonResponse({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
