import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Hashage des mots de passe avec scrypt (node:crypto — aucune dépendance).
 * Format stocké : `scrypt$N$r$p$salt$hash` (base64).
 */
const N = 16_384;
const R = 8;
const P = 1;
const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("base64");
  const hash = scryptSync(password, salt, KEYLEN, { N, r: R, p: P }).toString("base64");
  return `scrypt$${N}$${R}$${P}$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, n, r, p, salt, expected] = stored.split("$");
    if (scheme !== "scrypt" || !salt || !expected) return false;
    const actual = scryptSync(password, salt, KEYLEN, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
    const expectedBuf = Buffer.from(expected, "base64");
    return expectedBuf.length === actual.length && timingSafeEqual(actual, expectedBuf);
  } catch {
    return false;
  }
}
