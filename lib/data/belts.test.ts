import { describe, expect, it } from "vitest";
import { getBoxerBelts } from "./belts";

/**
 * Tests du module `belts` — ceintures remportées dérivées des résultats
 * OFFICIELS du pipeline (public/data/fights/{org}.json, committés).
 * Intégration sur les données réelles : si les shards changent, ajuster
 * les attentes (les boxeurs ci-dessous sont stables dans les shards 2024).
 */

describe("getBoxerBelts (shards officiels)", () => {
  it("Usyk : 7 ceintures IBF, groupées par organisation, triées par date décroissante", async () => {
    const belts = await getBoxerBelts("oleksandr-usyk");

    expect(belts).toHaveLength(1); // uniquement l'IBF dans les shards couverts
    const ibf = belts[0]!;
    expect(ibf.label).toBe("IBF");
    expect(ibf.wins).toHaveLength(7);

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
  });

  it("Canelo Álvarez : aucune ceinture dans les shards couverts (pas de combat de titre capturé)", async () => {
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
