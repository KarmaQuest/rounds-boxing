import { afterEach, describe, expect, it, vi } from "vitest";
import { BigBallsProvider } from "./bigballs";

function athlete(name: string) {
  return {
    id: `id-${name}`,
    name,
    nationality: "France",
    dob: "1990-01-01",
    height_cm: 180,
    reach_cm: 180,
    stance: "Orthodoxe",
    weight_class: "welterweight",
    current_ranking: null,
    record: null,
    external_ids: { wikidata: null, boxrec: null },
  };
}

describe("BigBallsProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("liste paginée : couvre le pool demandé en plusieurs requêtes de 100", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(String(url));
        const off = Number(new URL(String(url)).searchParams.get("offset") ?? 0);
        const data = Array.from({ length: 100 }, (_, i) => athlete(`Boxeur ${off + i}`));
        return {
          ok: true,
          status: 200,
          json: async () => ({ data, meta: { count: 100, total: 12_213 } }),
        } as unknown as Response;
      })
    );

    const p = new BigBallsProvider();
    const fighters = await p.listFighters(150);

    expect(fighters).toHaveLength(150);
    expect(calls).toHaveLength(2); // 100 + 50
    expect(calls[0]).toContain("offset=0");
    expect(calls[1]).toContain("offset=100");
  });

  it("une page vide arrête la pagination (fin de pool)", async () => {
    let n = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        n++;
        const data = n === 1 ? Array.from({ length: 100 }, (_, i) => athlete(`Boxeur ${i}`)) : [];
        return {
          ok: true,
          status: 200,
          json: async () => ({ data, meta: { count: data.length } }),
        } as unknown as Response;
      })
    );

    const p = new BigBallsProvider();
    const fighters = await p.listFighters(500);

    expect(fighters).toHaveLength(100);
    expect(n).toBe(2);
  });
});
