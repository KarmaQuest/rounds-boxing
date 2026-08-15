import type { Metadata } from "next";
import Link from "next/link";
import { dataStatus } from "@/lib/data";

export const metadata: Metadata = {
  title: "État des sources",
  description: "Usage des quotas API en direct.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/debug" },
};

/**
 * Dashboard des quotas (TASKS 1.2) : consommation par provider + état du
 * circuit breaker. Page de debug — noindex.
 */
export default async function DebugPage() {
  const providers = await dataStatus();

  const store = process.env.UPSTASH_REDIS_REST_URL
    ? "Redis (Upstash) — partagé entre instances"
    : "mémoire + fichier .data/quota.json (dev / VM)";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neon-soft">
        Diagnostics
      </p>
      <h1 className="mt-2 font-display text-4xl uppercase tracking-wide text-snow">
        État des <span className="text-neon text-glow-red">sources</span>
      </h1>

      <div className="mt-8 overflow-hidden rounded-2xl border border-line/60 bg-panel panel-glow">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line-soft text-left text-xs uppercase tracking-wider text-fog">
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Priorité</th>
              <th className="px-4 py-3 text-right font-medium">Quota (utilisé/limite)</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((p) => (
              <tr key={p.name} className="border-b border-line-soft last:border-0">
                <td className="px-4 py-3 font-medium text-snow">{p.name}</td>
                <td className="px-4 py-3 text-mist">{p.priority}</td>
                <td className="px-4 py-3 text-right font-display text-snow">
                  {p.usage}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-2xl border border-line/60 bg-panel/60 p-5 text-sm text-mist">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-fog">
          Compteurs
        </p>
        <p className="mt-2">{store}</p>
        <p className="mt-1 text-xs text-fog">
          Alerte console automatique à 80 % du quota du jour. API brute :{" "}
          <Link href="/api/health" className="text-neon-soft hover:underline">
            /api/health
          </Link>
        </p>
      </div>
    </div>
  );
}
