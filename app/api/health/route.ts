import { dataStatus } from "@/lib/data";

/**
 * GET /api/health — état de la couche données : providers actifs, quotas
 * consommés, priorité. Sert le dashboard quotas (/debug) et le monitoring
 * (alerte manuelle à 80 % via les logs du serveur).
 */
export async function GET() {
  const providers = await dataStatus();
  return Response.json({
    ok: true,
    time: new Date().toISOString(),
    providers,
  });
}
