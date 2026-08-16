import { describe, expect, it } from "vitest";
import { WikipediaProvider } from "./wikipedia";
import WIKIPEDIA_RECORDS from "./wikipedia-records.json";

describe("WikipediaProvider (snapshot)", () => {
  it("listFighters renvoie les stars avec leur palmarès réel (snapshot)", async () => {
    const p = new WikipediaProvider();
    const fighters = await p.listFighters(200);
    expect(fighters.length).toBeGreaterThan(0);

    const usyk = fighters.find((f) => f.slug === "oleksandr-usyk");
    expect(usyk).toBeDefined();
    // valeurs réelles du snapshot (issues des infobox Wikipedia)
    expect(usyk!.record.wins).toBeGreaterThanOrEqual(20);
    expect(usyk!.record.losses).toBeGreaterThanOrEqual(0);
    expect(usyk!.heightCm).toBeGreaterThan(100);
    expect(usyk!.reachCm).toBeGreaterThan(100);
    expect(usyk!.source).toBe("wikipedia");
    // les champs absents du snapshot viennent de la fiche de base (mock)
    expect(usyk!.country).toBeDefined();
    expect(usyk!.bio).toBeDefined();
  });

  it("listFighters limite le nombre de résultats", async () => {
    const p = new WikipediaProvider();
    const fighters = await p.listFighters(5);
    expect(fighters.length).toBe(5);
  });

  it("getFighter renvoie null pour un slug hors liste curatée", async () => {
    const p = new WikipediaProvider();
    expect(await p.getFighter("inconnu-pas-dans-le-mock")).toBeNull();
  });

  it("getFighter renvoie la fiche enrichie pour un slug connu", async () => {
    const p = new WikipediaProvider();
    const f = await p.getFighter("oleksandr-usyk");
    expect(f).not.toBeNull();
    expect(f!.record.wins).toBeGreaterThan(0);
    expect(f!.source).toBe("wikipedia");
  });

  it("searchFighters filtre par nom", async () => {
    const p = new WikipediaProvider();
    const all = await p.listFighters(200);
    const usyk = all.find((f) => f.slug === "oleksandr-usyk")!;
    const found = await p.searchFighters("usyk");
    expect(found.length).toBeGreaterThan(0);
    expect(found.some((f) => f.slug === usyk.slug)).toBe(true);
  });

  it("un boxeur hors mock (ex. Bakary Samaké) reçoit une fiche minimale avec son palmarès réel", async () => {
    const p = new WikipediaProvider();
    const f = await p.getFighter("bakary-samake");
    expect(f).not.toBeNull();
    expect(f!.record.wins).toBeGreaterThan(10); // 19-1-0 réel
    expect(f!.record.losses).toBeGreaterThanOrEqual(0);
    expect(f!.name).toBeDefined();
    expect(f!.source).toBe("wikipedia");
    // fiche minimale : pas de pays (le routeur fusionnera avec Big Balls)
    expect(f!.country).toBe("");
  });

  it("aucun appel réseau : le snapshot couvre tous les boxeurs curatés", async () => {
    const p = new WikipediaProvider();
    const all = await p.listFighters(200);
    // chaque fiche du snapshot a un record complet (wins + losses + draws)
    for (const f of all) {
      expect(f.record.wins).toBeGreaterThanOrEqual(0);
      expect(f.record.losses).toBeGreaterThanOrEqual(0);
      expect(f.record.draws).toBeGreaterThanOrEqual(0);
    }
  });

  it("le snapshot couvre largement le pool visible (Big Balls + stars)", () => {
    const slugs = Object.keys(WIKIPEDIA_RECORDS);
    expect(slugs.length).toBeGreaterThan(200);
    // chaque fiche a un name (nécessaire pour la fiche minimale)
    for (const slug of slugs) {
      const r = (WIKIPEDIA_RECORDS as Record<string, { name?: string }>)[slug];
      expect(r.name, `${slug}.name`).toBeTypeOf("string");
    }
  });

  it("le snapshot est cohérent : tous les records ont wins + losses + draws", () => {
    const slugs = Object.keys(WIKIPEDIA_RECORDS);
    expect(slugs.length).toBeGreaterThan(10);
    for (const slug of slugs) {
      const r = (WIKIPEDIA_RECORDS as Record<string, { record: { wins?: number; losses?: number; draws?: number } }>)[slug];
      expect(r.record.wins, `${slug}.wins`).toBeTypeOf("number");
      expect(r.record.losses, `${slug}.losses`).toBeTypeOf("number");
      expect(r.record.draws, `${slug}.draws`).toBeTypeOf("number");
    }
  });
});
