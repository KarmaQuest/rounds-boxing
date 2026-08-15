import type { NextConfig } from "next";

// `next dev` définit NODE_ENV=development ; en l'absence de valeur (next start
// sur certains environnements), on considère que c'est de la prod.
const isDev = process.env.NODE_ENV === "development";

/**
 * Headers de sécurité appliqués à toutes les réponses.
 * CSP : 'unsafe-inline' pour les scripts est requis par Next (payload RSC
 * inline). 'unsafe-eval' n'est nécessaire qu'en dev (Turbopack HMR) —
 * retiré en production. Une CSP à nonces pourra durcir ça plus tard.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
