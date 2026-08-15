import { describe, expect, it } from "vitest";
import { applyNewsQuery } from "./filter";
import type { NewsItem } from "./types";

function item(partial: Partial<NewsItem> & { title: string }): NewsItem {
  return {
    type: "article",
    id: partial.url ?? partial.title,
    url: partial.url ?? `https://x/${partial.title}`,
    source: "Source",
    sourceId: "src",
    publishedAt: "2026-08-15T10:00:00.000Z",
    ...partial,
  };
}

const ITEMS: NewsItem[] = [
  item({ title: "Usyk bat Fury au 9e round", type: "article", sourceId: "wbn", publishedAt: "2026-08-15T10:00:00.000Z" }),
  item({ title: "Canelo signe un nouveau contrat", type: "article", sourceId: "badlefthook", publishedAt: "2026-08-14T10:00:00.000Z" }),
  item({ title: "Highlights de la soirée", type: "video", sourceId: "dazn", publishedAt: "2026-08-16T10:00:00.000Z" }),
  item({ title: "Le combat du siècle annoncé", type: "article", sourceId: "wbn", publishedAt: "2026-08-13T10:00:00.000Z" }),
];

describe("applyNewsQuery", () => {
  it("filtre par type", () => {
    const { items } = applyNewsQuery(ITEMS, { type: "videos", offset: 0, limit: 10 });
    expect(items).toHaveLength(1);
    expect(items[0]!.type).toBe("video");
  });

  it("recherche floue sur le titre (typos tolérées)", () => {
    const { items } = applyNewsQuery(ITEMS, { type: "all", q: "usyk", offset: 0, limit: 10 });
    expect(items.map((i) => i.title)).toEqual(["Usyk bat Fury au 9e round"]);
    // « uzyk » (typo) doit trouver Usyk
    const typo = applyNewsQuery(ITEMS, { type: "all", q: "uzyk", offset: 0, limit: 10 });
    expect(typo.items.map((i) => i.title)).toEqual(["Usyk bat Fury au 9e round"]);
  });

  it("filtre par source", () => {
    const { items, total } = applyNewsQuery(ITEMS, { type: "all", source: "wbn", offset: 0, limit: 10 });
    expect(total).toBe(2);
    expect(items.every((i) => i.sourceId === "wbn")).toBe(true);
  });

  it("trie par date asc/desc", () => {
    const desc = applyNewsQuery(ITEMS, { type: "all", sort: "desc", offset: 0, limit: 10 });
    expect(desc.items[0]!.publishedAt > desc.items[1]!.publishedAt).toBe(true);
    const asc = applyNewsQuery(ITEMS, { type: "all", sort: "asc", offset: 0, limit: 10 });
    expect(asc.items[0]!.publishedAt < asc.items[1]!.publishedAt).toBe(true);
  });

  it("paginate avec hasMore", () => {
    const page1 = applyNewsQuery(ITEMS, { type: "all", offset: 0, limit: 2 });
    expect(page1.items).toHaveLength(2);
    expect(page1.total).toBe(4);
    expect(page1.hasMore).toBe(true);

    const page2 = applyNewsQuery(ITEMS, { type: "all", offset: 2, limit: 2 });
    expect(page2.items).toHaveLength(2);
    expect(page2.hasMore).toBe(false);

    // au-delà de la fin → vide, pas de dépassement
    const page3 = applyNewsQuery(ITEMS, { type: "all", offset: 10, limit: 2 });
    expect(page3.items).toHaveLength(0);
    expect(page3.hasMore).toBe(false);
  });

  it("combine recherche + source + pagination", () => {
    const page = applyNewsQuery(ITEMS, {
      type: "articles",
      q: "combat",
      source: "wbn",
      offset: 0,
      limit: 5,
    });
    expect(page.items.map((i) => i.title)).toEqual(["Le combat du siècle annoncé"]);
    expect(page.total).toBe(1);
  });

  it("limite l'offset négatif et le limit hors bornes", () => {
    const p = applyNewsQuery(ITEMS, { type: "all", offset: -5, limit: 999 });
    expect(p.items.length).toBeGreaterThan(0);
    expect(p.items.length).toBeLessThanOrEqual(4);
  });
});
