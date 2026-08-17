import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShardsFightsProvider, toScheduledFight } from "./shardsfights";

function pipelineFight(over: Record<string, unknown> = {}) {
  return {
    id: "abc123",
    date: "2026-08-15",
    location: "Las Vegas, NV",
    weight_class: "Poids lourds",
    fighter_a: "Canelo Álvarez",
    fighter_b: "Christian Mbilli",
    winner: "Canelo Álvarez",
    method: "UD",
    rounds: 12,
    is_title_fight: true,
    ...over,
  };
}

// Le provider lit `process.cwd()/public/data/` — les fixtures vont donc sous
// un cwd factice (stubé) avec l'arborescence public/data réelle.
function dataDirOf(dir: string): string {
  return join(dir, "public", "data");
}

function writeShard(dir: string, slug: string, fights: unknown[]) {
  const fightsDir = join(dataDirOf(dir), "fights");
  mkdirSync(fightsDir, { recursive: true });
  writeFileSync(join(fightsDir, `${slug}.json`), JSON.stringify(fights), "utf-8");
}

function writeIndex(dir: string, orgs: Record<string, unknown>) {
  mkdirSync(dataDirOf(dir), { recursive: true });
  writeFileSync(
    join(dataDirOf(dir), "organizations-index.json"),
    JSON.stringify({ organizations: orgs }),
    "utf-8"
  );
}

function scheduledFight(over: Record<string, unknown> = {}) {
  return {
    id: "sched-1",
    date: "2026-10-10",
    location: "Bohol, Philippines",
    weight_class: "Jr. Flyweight (108 LBS)",
    fighter_a: "Regie Suganob",
    fighter_b: "Sivenathi Nontshinga",
    is_title_fight: true,
    amateur: false,
    bout_type: "Eliminator for #1",
    promoter: "PMI Bohol",
    org: "IBF",
    ...over,
  };
}

function writeScheduleShard(dir: string, slug: string, fights: unknown[]) {
  const dirPath = join(dataDirOf(dir), "fights-upcoming");
  mkdirSync(dirPath, { recursive: true });
  writeFileSync(join(dirPath, `${slug}.json`), JSON.stringify(fights), "utf-8");
}

function writeVerification(dir: string, items: Array<{ id: string; status: string }>) {
  writeFileSync(
    join(dataDirOf(dir), "fights-upcoming-verification.json"),
    JSON.stringify({ items }),
    "utf-8"
  );
}

describe("ShardsFightsProvider", () => {
  let dir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "shards-test-"));
    cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(dir);
  });

  afterEach(() => {
    cwdSpy.mockRestore();
    rmSync(dir, { recursive: true, force: true });
  });

  it("mappe un combat pipeline vers le type Fight du front", async () => {
    writeIndex(dir, { wbc: {} });
    writeShard(dir, "wbc", [
      pipelineFight({ weight_class: "Poids lourds", is_title_fight: true }),
    ]);
    const p = new ShardsFightsProvider();
    const fights = await p.getRecentFights();

    expect(fights).toHaveLength(1);
    const f = fights[0]!;
    expect(f.id).toBe("abc123");
    expect(f.date).toBe("2026-08-15");
    expect(f.status).toBe("finished");
    expect(f.weightClass).toBe("Poids lourds");
    expect(f.title).toBe("Combat de titre");
    expect(f.location).toBe("Las Vegas, NV");
    expect(f.fighters[0]!.name).toBe("Canelo Álvarez");
    expect(f.fighters[1]!.name).toBe("Christian Mbilli");
    expect(f.outcome).toEqual({ winnerIndex: 0, method: "UD", round: 12 });
    expect(f.source).toBe("wbc");
  });

  it("vainqueur B → winnerIndex 1", async () => {
    writeIndex(dir, { wba: {} });
    writeShard(dir, "wba", [
      pipelineFight({ winner: "Christian Mbilli", is_title_fight: false }),
    ]);
    const [f] = await new ShardsFightsProvider().getRecentFights();
    expect(f!.outcome!.winnerIndex).toBe(1);
    expect(f!.title).toBeUndefined();
  });

  it("Draw → pas de winnerIndex (nul), titre ceinture → nom brut", async () => {
    writeIndex(dir, { ibf: {} });
    writeShard(dir, "ibf", [
      pipelineFight({
        winner: "Draw",
        weight_class: "WBA INTERCONTINENTAL LIGHT HEAVYWEIGHT",
        is_title_fight: true,
      }),
    ]);
    const [f] = await new ShardsFightsProvider().getRecentFights();
    expect(f!.outcome!.winnerIndex).toBeUndefined();
    expect(f!.weightClass).toBe("Poids mi-lourds");
    // la ceinture détectée dans la catégorie → titre = catégorie brute
    expect(f!.title).toBe("WBA INTERCONTINENTAL LIGHT HEAVYWEIGHT");
  });

  it("catégorie EN → mapping canonique FR", async () => {
    writeIndex(dir, { wbc: {} });
    writeShard(dir, "wbc", [
      pipelineFight({ id: "w1", weight_class: "Junior Lightweight", is_title_fight: false }),
      pipelineFight({ id: "w2", weight_class: "Super Middleweight", is_title_fight: false }),
      pipelineFight({ id: "w3", weight_class: "Light Heavyweight", is_title_fight: false }),
    ]);
    const fights = await new ShardsFightsProvider().getRecentFights();
    // mêmes dates → tri stable = ordre du shard
    expect(fights.map((f) => f.weightClass)).toEqual([
      "Poids super-légers", // Junior Lightweight
      "Poids super-moyens", // Super Middleweight
      "Poids mi-lourds", // Light Heavyweight
    ]);
  });

  it("dédup inter-sources : le même combat vu par 2 sources n'apparaît qu'une fois", async () => {
    writeIndex(dir, { wbc: {}, nsac: {} });
    const shared = pipelineFight({ id: "same-id" });
    writeShard(dir, "wbc", [shared]);
    writeShard(dir, "nsac", [shared, pipelineFight({ id: "other", date: "2026-01-01" })]);
    const fights = await new ShardsFightsProvider().getRecentFights();
    expect(fights).toHaveLength(2);
    expect(new Set(fights.map((f) => f.id)).size).toBe(2);
  });

  it("tri par date décroissante + limite", async () => {
    writeIndex(dir, { wbc: {} });
    writeShard(dir, "wbc", [
      pipelineFight({ id: "a", date: "2026-01-01" }),
      pipelineFight({ id: "b", date: "2026-08-15" }),
      pipelineFight({ id: "c", date: "2026-05-01" }),
    ]);
    const fights = await new ShardsFightsProvider().getRecentFights(2);
    expect(fights.map((f) => f.date)).toEqual(["2026-08-15", "2026-05-01"]);
  });

  it("pas de shards (pipeline pas runné) → [] propre", async () => {
    const p = new ShardsFightsProvider();
    expect(await p.getRecentFights()).toEqual([]);
  });

  it("combats incomplets sautés", async () => {
    writeIndex(dir, { wbc: {} });
    writeShard(dir, "wbc", [pipelineFight({ fighter_a: "" })]);
    expect(await new ShardsFightsProvider().getRecentFights()).toEqual([]);
  });

  it("les autres capacités restent vides (programmation = mock/odds)", async () => {
    const p = new ShardsFightsProvider();
    expect(await p.getUpcomingFights()).toEqual([]);
    expect(await p.listFighters()).toEqual([]);
    expect(await p.searchFighters("usyk")).toEqual([]);
    expect(await p.getFighter("usyk")).toBeNull();
    expect(p.isActive()).toBe(true);
  });

  describe("programmation (fights-upcoming)", () => {
    it("mappe un combat programmé vers Fight (status upcoming)", () => {
      const f = toScheduledFight(scheduledFight(), "ibf");
      expect(f.id).toBe("sched-1");
      expect(f.status).toBe("upcoming");
      expect(f.date).toBe("2026-10-10");
      expect(f.fighters.map((x) => x.name)).toEqual(["Regie Suganob", "Sivenathi Nontshinga"]);
      expect(f.weightClass).toBe("Poids mouches"); // Jr. Flyweight
      expect(f.title).toBe("Eliminator for #1 — Jr. Flyweight (108 LBS)");
      expect(f.location).toBe("Bohol, Philippines");
      expect(f.amateur).toBe(false);
      expect(f.boutType).toBe("Eliminator for #1");
      expect(f.source).toBe("ibf");
      expect(f.outcome).toBeUndefined();
    });

    it("lit les shards, trie par date croissante (le plus proche d'abord)", async () => {
      writeScheduleShard(dir, "wbc", [
        scheduledFight({ id: "late", date: "2026-12-01" }),
        scheduledFight({ id: "soon", date: "2026-09-01" }),
      ]);
      const fights = await new ShardsFightsProvider().getUpcomingProgrammation();
      expect(fights.map((f) => f.date)).toEqual(["2026-09-01", "2026-12-01"]);
      expect(fights[0]!.source).toBe("wbc");
    });

    it("exclut les combats refusés par la vérification IA (flagged)", async () => {
      writeScheduleShard(dir, "ibf", [
        scheduledFight({ id: "ok" }),
        scheduledFight({ id: "douteux" }),
      ]);
      writeVerification(dir, [
        { id: "ok", status: "confirmed" },
        { id: "douteux", status: "flagged" },
      ]);
      const fights = await new ShardsFightsProvider().getUpcomingProgrammation();
      expect(fights.map((f) => f.id)).toEqual(["ok"]);
    });

    it("dédup inter-sources par id", async () => {
      const shared = scheduledFight({ id: "same" });
      writeScheduleShard(dir, "wbc", [shared]);
      writeScheduleShard(dir, "ibf", [shared, scheduledFight({ id: "other" })]);
      const fights = await new ShardsFightsProvider().getUpcomingProgrammation();
      expect(fights).toHaveLength(2);
    });

    it("pas de shards programmation → [] propre", async () => {
      expect(await new ShardsFightsProvider().getUpcomingProgrammation()).toEqual([]);
    });

    it("combats incomplets sautés", async () => {
      writeScheduleShard(dir, "wbc", [scheduledFight({ fighter_a: "" })]);
      expect(await new ShardsFightsProvider().getUpcomingProgrammation()).toEqual([]);
    });
  });

  it("intégration : lit les vrais shards du pipeline (si présents)", async () => {
    cwdSpy.mockRestore(); // cwd réel = boxing-app → public/data réel
    const p = new ShardsFightsProvider();
    const fights = await p.getRecentFights(50);
    if (fights.length === 0) {
      // pipeline pas runné → comportement attendu, rien à vérifier
      return;
    }
    expect(fights.length).toBeGreaterThan(0);
    // chaque combat respecte le contrat front
    for (const f of fights) {
      expect(f.status).toBe("finished");
      expect(f.fighters).toHaveLength(2);
      expect(f.fighters[0]!.name.length).toBeGreaterThan(0);
      expect(f.fighters[1]!.name.length).toBeGreaterThan(0);
      expect(f.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (f.outcome && f.outcome.winnerIndex !== undefined) {
        expect([0, 1]).toContain(f.outcome.winnerIndex);
      }
      expect(f.source?.length ?? 0).toBeGreaterThan(0);
    }
  });
});
