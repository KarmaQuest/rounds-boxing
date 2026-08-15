import { describe, expect, it } from "vitest";
import { searchBoxeurs } from "./index";

/**
 * Tests d'intégration de la couche publique (index.ts) sur le mock
 * (aucune clé API en environnement de test) : le pipeline complet
 * routeur → fusion → filtres → pagination.
 */
describe("searchBoxeurs (intégration mock)", () => {
  it("« uzyk » trouve Oleksandr Usyk (recherche floue côté API)", async () => {
    const { fighters } = await searchBoxeurs({ q: "uzyk", limit: 5 });
    expect(fighters.some((f) => f.slug === "oleksandr-usyk")).toBe(true);
  });

  it("« canlo » trouve Canelo Álvarez (1 faute de frappe)", async () => {
    const { fighters } = await searchBoxeurs({ q: "canlo", limit: 5 });
    expect(fighters.some((f) => f.slug === "canelo-alvarez")).toBe(true);
  });

  it("applique la pagination offset/limit (TASKS 2.1)", async () => {
    const page1 = await searchBoxeurs({ limit: 5, offset: 0 });
    const page2 = await searchBoxeurs({ limit: 5, offset: 5 });
    expect(page1.fighters).toHaveLength(5);
    expect(page2.fighters).toHaveLength(5);
    const slugs1 = new Set(page1.fighters.map((f) => f.slug));
    for (const f of page2.fighters) {
      expect(slugs1.has(f.slug)).toBe(false);
    }
  });

  it("filtre par catégorie combiné à la pagination", async () => {
    const { fighters } = await searchBoxeurs({
      weightClass: "Poids super-moyens",
      limit: 10,
    });
    expect(fighters.length).toBeGreaterThan(0);
    expect(fighters.every((f) => f.weightClass === "Poids super-moyens")).toBe(true);
  });
});
