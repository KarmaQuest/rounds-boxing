import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OddsApiProvider } from "./oddsapi";

/**
 * Tests d'OddsApiProvider — endpoint /scores : les combats à venir qui ont
 * eu lieu basculent en « Résultats récents » (completed: true).
 */

const originalKey = process.env.ODDS_API_KEY;

beforeEach(() => {
  process.env.ODDS_API_KEY = "test-key";
});

afterEach(() => {
  if (originalKey === undefined) delete process.env.ODDS_API_KEY;
  else process.env.ODDS_API_KEY = originalKey;
  vi.unstubAllGlobals();
});

function stubScores(events: unknown[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ status: 200, ok: true, json: async () => events }) as unknown as Response)
  );
}

describe("OddsApiProvider.getRecentFights (endpoint /scores)", () => {
  it("ne renvoie que les combats TERMINÉS (completed: true)", async () => {
    stubScores([
      {
        id: "a",
        commence_time: "2026-08-22T00:00:00Z",
        home_team: "Amanda Serrano",
        away_team: "Lucrecia Manzur",
        completed: false, // à venir → ignoré
        scores: null,
      },
      {
        id: "b",
        commence_time: "2026-08-15T00:00:00Z",
        home_team: "A Fighter",
        away_team: "B Fighter",
        completed: true,
        scores: [
          { name: "A Fighter", score: "2" },
          { name: "B Fighter", score: "1" },
        ],
      },
    ]);

    const provider = new OddsApiProvider();
    const fights = await provider.getRecentFights();

    expect(fights).toHaveLength(1);
    expect(fights[0]!.status).toBe("finished");
    expect(fights[0]!.outcome!.winnerIndex).toBe(0); // le plus grand score
    expect(fights[0]!.date).toBe("2026-08-15T00:00:00Z");
    expect(fights[0]!.source).toBe("oddsapi");
  });

  it("le vainqueur est déduit du score le plus élevé (home ou away)", async () => {
    stubScores([
      {
        id: "c",
        commence_time: "2026-08-14T00:00:00Z",
        home_team: "Home Boxer",
        away_team: "Away Boxer",
        completed: true,
        scores: [
          { name: "Home Boxer", score: "1" },
          { name: "Away Boxer", score: "3" },
        ],
      },
    ]);

    const provider = new OddsApiProvider();
    const fights = await provider.getRecentFights();
    expect(fights[0]!.outcome!.winnerIndex).toBe(1); // Away Boxer gagne
  });

  it("sans scores exploitables, pas de vainqueur (winnerIndex absent) mais combat terminé", async () => {
    stubScores([
      {
        id: "d",
        commence_time: "2026-08-13T00:00:00Z",
        home_team: "A",
        away_team: "B",
        completed: true,
        scores: null,
      },
    ]);

    const provider = new OddsApiProvider();
    const fights = await provider.getRecentFights();
    expect(fights).toHaveLength(1);
    expect(fights[0]!.outcome!.winnerIndex).toBeUndefined();
  });

  it("applique la limite demandée", async () => {
    const events = Array.from({ length: 5 }, (_, i) => ({
      id: `e${i}`,
      commence_time: "2026-08-10T00:00:00Z",
      home_team: `Home ${i}`,
      away_team: `Away ${i}`,
      completed: true,
      scores: [
        { name: `Home ${i}`, score: "1" },
        { name: `Away ${i}`, score: "0" },
      ],
    }));
    stubScores(events);

    const provider = new OddsApiProvider();
    const fights = await provider.getRecentFights(2);
    expect(fights).toHaveLength(2);
  });
});
