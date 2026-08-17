import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MergedBoxersProvider, resetAnnuaireCache } from "./mergedboxers";

function mergedBoxer(over: Record<string, unknown>) {
  return {
    id: "orgs-bakary-samake",
    name: "Bakary Samake",
    slug: "bakary-samake",
    aliases: [],
    country: "",
    weight_class: "",
    birth_date: "2003-06-29",
    height_cm: 0,
    reach_cm: 0,
    stance: "",
    record: [8, 0, 0, 3],
    sources: ["wikidata", "bigballs", "orgs"],
    wikidata_id: "Q132851115",
    orgs: ["ffboxe", "ibf"],
    title_fights: 4,
    ...over,
  };
}

function writeMerged(dir: string, boxers: unknown[]) {
  const dirPath = join(dir, "public", "data", "boxers");
  mkdirSync(dirPath, { recursive: true });
  writeFileSync(join(dirPath, "merged.json"), JSON.stringify(boxers), "utf-8");
}

describe("MergedBoxersProvider", () => {
  let dir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "mergedboxers-test-"));
    cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(dir);
    resetAnnuaireCache();
  });

  afterEach(() => {
    cwdSpy.mockRestore();
    resetAnnuaireCache();
    rmSync(dir, { recursive: true, force: true });
  });

  it("trouve un boxeur absent des APIs live (ex. Bakary Samake)", async () => {
    writeMerged(dir, [
      mergedBoxer({}),
      mergedBoxer({ name: "Oleksandr Usyk", slug: "oleksandr-usyk", record: [7, 0, 0, 4] }),
    ]);
    const provider = new MergedBoxersProvider();
    const found = await provider.searchFighters("Bakary Samake", 10);
    expect(found).toHaveLength(1);
    expect(found[0]!.slug).toBe("bakary-samake");
    expect(found[0]!.record).toEqual({ wins: 8, losses: 0, draws: 0, ko: 3 });
    expect(found[0]!.source).toBe("annuaire");
  });

  it("recherche insensible aux accents (Samaké → samake)", async () => {
    writeMerged(dir, [mergedBoxer({})]);
    const found = await new MergedBoxersProvider().searchFighters("Samaké", 10);
    expect(found.map((f) => f.slug)).toContain("bakary-samake");
  });

  it("getFighter résout la page d'un slug présent dans l'annuaire", async () => {
    writeMerged(dir, [mergedBoxer({})]);
    const fighter = await new MergedBoxersProvider().getFighter("bakary-samake");
    expect(fighter).not.toBeNull();
    expect(fighter!.name).toBe("Bakary Samake");
    expect(fighter!.weightClass).toBe("Poids lourds"); // catégorie vide → défaut
    expect(fighter!.age).toBeGreaterThan(18);
  });

  it("listFighters retourne l'annuaire (limité)", async () => {
    writeMerged(dir, [mergedBoxer({}), mergedBoxer({ slug: "x", name: "X" })]);
    const list = await new MergedBoxersProvider().listFighters(1);
    expect(list).toHaveLength(1);
  });

  it("merged.json absent → listes vides propres", async () => {
    const provider = new MergedBoxersProvider();
    expect(await provider.searchFighters("Bakary", 10)).toEqual([]);
    expect(await provider.getFighter("bakary-samake")).toBeNull();
  });
});
