import { describe, expect, it } from "vitest";
import { getBoxerFights, getCombatsRecents, searchBoxeurs } from "./index";

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

describe("getBoxerFights (tous les résultats d'un boxeur)", () => {
  it("Usyk : remonte sa carrière depuis les shards (Dubois 2025, Fury 2024…), pas seulement le top-30 mondial", async () => {
    const fights = await getBoxerFights("Oleksandr Usyk", 40);

    // les vrais shards du pipeline sont committés → au moins les combats IBF
    expect(fights.length).toBeGreaterThan(0);

    // le dernier combat d'Usyk (Dubois, juillet 2025) apparaît en tête
    expect(fights[0]!.date).toBe("2025-07-19");
    expect(
      fights[0]!.fighters.some((f) => f.name.toLowerCase().includes("dubois"))
    ).toBe(true);

    // toute la carrière remonte (pas seulement les 30 derniers du monde)
    const dates = fights.map((f) => f.date);
    expect(dates[dates.length - 1]!).toBe("2018-07-21");

    // tri décroissant + dédup (pas de doublon Usyk-Fury)
    const sorted = [...dates].sort((a, b) => b.localeCompare(a));
    expect(dates).toEqual(sorted);
  });

  it("combat du mock inclus s'il n'existe pas dans les shards (enrichissement)", async () => {
    const fights = await getBoxerFights("Christian Mbilli", 40);
    // Mbilli n'a pas (ou peu) de combats dans les shards → le mock
    // (Montréal 2024) complète la carrière
    const montreal = fights.find((f) =>
      f.fighters.some((x) => x.name === "Christian Mbilli") &&
      (f.venue ?? "").includes("Bell")
    );
    expect(fights.length).toBeGreaterThan(0);
    expect(montreal?.date ?? "").toBe("2024-09-28");
  });

  it("boxeur inconnu → liste vide (pas d'erreur)", async () => {
    expect(await getBoxerFights("Boxeur Inexistant XYZ", 40)).toEqual([]);
  });
});

describe("getCombatsRecents (intégration shards officiels)", () => {
  it("sert les combats des shards du pipeline (source non-mock)", async () => {
    const { fights, source } = await getCombatsRecents(20);
    // les shards du pipeline existent (public/data/) → ils sont servis
    if (fights.length > 0) {
      expect(source.split(" + ")).toContain("shards");
      // le champ `source` de chaque combat porte le slug d'organisation
      // (ibf, csac, …) — plus informatif que le nom du provider
      const ORG_SLUGS = ["ibf", "wba", "wbc", "wbo", "csac", "nsac", "ffboxe"];
      const shardFights = fights.filter((f) =>
        f.source !== undefined && ORG_SLUGS.includes(f.source)
      );
      expect(shardFights.length).toBeGreaterThan(0);
      for (const f of shardFights) {
        expect(f.status).toBe("finished");
        expect(f.fighters).toHaveLength(2);
      }
    }
  });
});
