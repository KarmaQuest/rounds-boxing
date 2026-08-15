import type { Fight } from "../types";
import { fetchJson } from "./router";
import type { DataProvider } from "./provider";

/**
 * The Odds API — cotes et événements à venir.
 * Docs : https://the-odds-api.com
 *
 * - Endpoint : /v4/sports/boxing_boxing/odds/?regions=eu,uk&markets=h2h
 *   (la clé sport est boxing_boxing, vérifiée en live)
 * - Gratuit : 500 crédits/mois (~16 requêtes/jour) → NE PAS abuser.
 *   C'est pourquoi le cache TTL est court (10 min) et que ce provider
 *   n'est activé que pour les "combats à venir".
 *
 * ⚠️ Schéma défensif : on ne garde que la meilleure cote par boxeur.
 */

interface OddsOutcome {
  name: string;
  price: number;
}

interface OddsMarket {
  key: string;
  outcomes?: OddsOutcome[];
}

interface OddsBookmaker {
  key: string;
  title: string;
  markets?: OddsMarket[];
}

interface OddsEvent {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers?: OddsBookmaker[];
}

const BASE = "https://api.the-odds-api.com/v4/sports/boxing_boxing";

export class OddsApiProvider implements DataProvider {
  readonly name = "oddsapi";
  readonly priority = 1;
  readonly capabilities = ["odds"] as const;
  readonly dailyLimit = Number(process.env.ODDS_DAILY_LIMIT ?? 16);

  isActive(): boolean {
    return Boolean(process.env.ODDS_API_KEY);
  }

  async getUpcomingFights(limit = 20): Promise<Fight[]> {
    const events = await fetchJson<OddsEvent[]>(
      `${BASE}/odds/?apiKey=${process.env.ODDS_API_KEY}&regions=eu,uk&markets=h2h&oddsFormat=decimal`
    );

    return events.slice(0, limit).map((ev): Fight => {
      // meilleure cote pour chaque boxeur parmi tous les bookmakers
      const best: Record<string, number> = {};
      for (const bm of ev.bookmakers ?? []) {
        for (const m of bm.markets ?? []) {
          if (m.key !== "h2h") continue;
          for (const o of m.outcomes ?? []) {
            const price = best[o.name];
            if (price === undefined || o.price < price) best[o.name] = o.price;
          }
        }
      }

      const odds: [number, number] = [
        best[ev.home_team] ?? 2.0,
        best[ev.away_team] ?? 2.0,
      ];

      return {
        id: `odds-${ev.id}`,
        date: ev.commence_time,
        status: "upcoming",
        fighters: [
          { name: ev.home_team },
          { name: ev.away_team },
        ],
        odds,
        source: "oddsapi",
      };
    });
  }

  async getRecentFights(): Promise<Fight[]> {
    return [];
  }

  async searchFighters(): Promise<never[]> {
    return [];
  }

  async listFighters(): Promise<never[]> {
    return [];
  }

  async getFighter(): Promise<null> {
    return null;
  }
}
