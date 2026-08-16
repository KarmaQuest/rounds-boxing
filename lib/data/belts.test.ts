import { describe, expect, it } from "vitest";
import { getBoxerBelts } from "./belts";

/**
 * Tests du module `belts` — ceintures remportées dérivées des résultats
 * OFFICIELS du pipeline (public/data/fights/{org}.json, committés).
 * Intégration sur les données réelles : si les shards changent, ajuster
 * les attentes (les boxeurs ci-dessous sont stables dans les shards 2024).
 */

describe("getBoxerBelts (shards officiels)", () => {
  it("Usyk : 7 ceintures IBF + statut curé « Vacant » sur les 4 organisations", async () => {
    const belts = await getBoxerBelts("oleksandr-usyk");

    // 4 organisations : l'IBF (historique des shards) + WBA/WBC/WBO (statut curé)
    expect(belts.map((b) => b.org).sort()).toEqual(["ibf", "wba", "wbc", "wbo"]);

    const ibf = belts.find((b) => b.org === "ibf")!;
    expect(ibf.label).toBe("IBF");
    expect(ibf.wins).toHaveLength(7);
    expect(ibf.status).toBeDefined();
    expect(ibf.status!.state).toBe("Vacant"); // abandon des ceintures en 2026

    // 5 défenses poids lourds (2021→2025) + 2 cruiserweight (2018)
    const heavy = ibf.wins.filter((w) => w.belt === "Poids lourds");
    const cruiser = ibf.wins.filter((w) => w.belt === "Poids lourds-légers");
    expect(heavy).toHaveLength(5);
    expect(cruiser).toHaveLength(2);

    // plus récente en premier
    expect(ibf.wins[0]!.date).toBe("2025-07-19");
    expect(ibf.wins[ibf.wins.length - 1]!.date).toBe("2018-07-21");

    // chaque entrée porte l'org
    expect(ibf.wins.every((w) => w.org === "ibf" && w.label === "IBF")).toBe(true);

    // les orgs curées sans historique n'ont pas de wins mais un statut
    for (const org of ["wba", "wbc", "wbo"]) {
      const b = belts.find((x) => x.org === org)!;
      expect(b.status!.state).toBe("Vacant");
      expect(b.wins).toEqual([]);
    }
  });

  it("Canelo Álvarez : aucune ceinture dans les shards couverts ni statut curé (pas de combat de titre capturé)", async () => {
    const belts = await getBoxerBelts("canelo-alvarez");
    expect(belts).toEqual([]);
  });

  it("une ceinture régionale WBA garde son nom brut (pas mappée en catégorie FR)", async () => {
    const belts = await getBoxerBelts("aldana-florencia-lopez");
    const wba = belts.find((b) => b.org === "wba");
    expect(wba).toBeDefined();
    expect(wba!.wins[0]!.belt).toContain("WBA"); // ex. « WBA FEMALE INTERNATIONAL LIGHT MINIMUMWEIGHT »
  });

  it("un boxeur inconnu ne renvoie rien (pas d'erreur)", async () => {
    const belts = await getBoxerBelts("boxeur-inexistant-xyz");
    expect(belts).toEqual([]);
  });
});
