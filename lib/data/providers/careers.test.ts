import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Fight } from "../types";
import { boutToFight, CareersProvider, mergeCareers, resetCareersCache } from "./careers";
import { resetAnnuaireCache } from "./mergedboxers";
import type { WikipediaBout } from "./wikipedia-types";

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
    org: "wbc",
    ...over,
  };
}

function writeCareers(dir: string, boxers: Record<string, unknown>) {
  const boxersDir = join(dir, "public", "data", "boxers");
  mkdirSync(boxersDir, { recursive: true });
  writeFileSync(
    join(boxersDir, "careers.json"),
    JSON.stringify({ generated_at: "2026-08-17T00:00:00Z", boxers }),
    "utf-8"
  );
}

describe("CareersProvider", () => {
  let dir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "careers-test-"));
    cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(dir);
    resetAnnuaireCache();
    resetCareersCache();
  });

  afterEach(() => {
    cwdSpy.mockRestore();
    resetAnnuaireCache();
    resetCareersCache();
    rmSync(dir, { recursive: true, force: true });
  });

  it("mappe la carrière d'un boxeur vers le type Fight du front", async () => {
    writeCareers(dir, {
      "canelo-alvarez": {
        id: "boxer-1",
        name: "Canelo Álvarez",
        fights: [
          pipelineFight(),
          pipelineFight({ id: "old1", date: "2025-05-01", winner: "Christian Mbilli" }),
        ],
      },
    });
    const fights = await new CareersProvider({}).getCareer("canelo-alvarez");
    expect(fights).toHaveLength(2);
    expect(fights[0]!.date).toBe("2026-08-15"); // tri date desc
    expect(fights[1]!.date).toBe("2025-05-01");
    expect(fights[0]!.status).toBe("finished");
    expect(fights[0]!.outcome).toEqual({ winnerIndex: 0, method: "UD", round: 12 });
    expect(fights[0]!.source).toBe("wbc"); // org du shard source
    expect(fights[1]!.outcome!.winnerIndex).toBe(1);
  });

  it("dédup par id : le même combat vu par 2 sources n'apparaît qu'une fois", async () => {
    const shared = pipelineFight({ id: "same-id" });
    writeCareers(dir, {
      "canelo-alvarez": {
        id: "boxer-1",
        name: "Canelo Álvarez",
        fights: [
          shared,
          shared,
          pipelineFight({ id: "other", date: "2025-05-01" }), // combat distinct
        ],
      },
    });
    const fights = await new CareersProvider({}).getCareer("canelo-alvarez");
    expect(fights).toHaveLength(2);
  });

  it("boxeur sans carrière → [] propre", async () => {
    writeCareers(dir, { "canelo-alvarez": { id: "b1", name: "Canelo", fights: [] } });
    expect(await new CareersProvider({}).getCareer("canelo-alvarez")).toEqual([]);
    expect(await new CareersProvider({}).getCareer("inconnu")).toEqual([]);
  });

  it("careers.json absent (pipeline pas généré) → [] propre", async () => {
    expect(await new CareersProvider({}).getCareer("canelo-alvarez")).toEqual([]);
  });

  it("fusionne le palmarès complet Wikipedia avec l'archive pipeline", async () => {
    writeCareers(dir, {
      "oleksandr-usyk": {
        id: "boxer-1",
        name: "Oleksandr Usyk",
        fights: [
          // le même combat que le 2e bout Wikipedia → dédupliqué (pipeline prime)
          pipelineFight({
            id: "ibf-1",
            date: "2025-07-19",
            fighter_a: "Oleksandr Usyk",
            fighter_b: "Daniel Dubois",
            winner: "Oleksandr Usyk",
            method: "KO",
            rounds: 5,
            org: "ibf",
          }),
        ],
      },
    });
    const wiki = {
      "oleksandr-usyk": {
        name: "Oleksandr Usyk",
        record: { wins: 25, losses: 0, draws: 0, ko: 16 },
        bouts: [
          {
            result: "Win",
            opponent: "Rico Verhoeven",
            type: "TKO",
            round: 11,
            date: "2026-05-23",
            location: "Pyramids of Giza, Giza, Egypt",
            title: "Titre WBA, WBC, The Ring",
          } as WikipediaBout,
          {
            result: "Win",
            opponent: "Daniel Dubois",
            type: "KO",
            round: 5,
            date: "2025-07-19",
          } as WikipediaBout,
          {
            result: "Win",
            opponent: "Tyson Fury",
            type: "UD",
            round: 12,
            date: "2024-05-18",
          } as WikipediaBout,
        ],
      },
    };
    const fights = await new CareersProvider(wiki).getCareer("oleksandr-usyk");
    // pipeline (Dubois, dédupliqué avec Wikipedia) + Verhoeven + Fury = 3
    expect(fights).toHaveLength(3);
    expect(fights[0]!.date).toBe("2026-05-23"); // dernier combat en premier
    expect(fights[0]!.fighters[1]!.name).toBe("Rico Verhoeven");
    expect(fights[0]!.outcome).toEqual({ winnerIndex: 0, method: "TKO", round: 11 });
    // le combat partagé garde la version pipeline (org ibf, pas wikipedia)
    const dubois = fights.find((f) => f.date === "2025-07-19")!;
    expect(dubois.source).toBe("ibf");
    expect(fights[2]!.date).toBe("2024-05-18");
  });

  it("enrichit les adversaires avec le drapeau de l'annuaire (merged.json)", async () => {
    writeCareers(dir, {
      "canelo-alvarez": {
        id: "boxer-1",
        name: "Canelo Álvarez",
        fights: [pipelineFight({ id: "f1", date: "2026-08-15" })],
      },
    });
    // adversaire présent dans l'annuaire avec un pays
    const mergedDir = join(dir, "public", "data", "boxers");
    mkdirSync(mergedDir, { recursive: true });
    writeFileSync(
      join(mergedDir, "merged.json"),
      JSON.stringify([
        { name: "Christian Mbilli", slug: "christian-mbilli", country: "France", record: [27, 0, 0, 23] },
      ]),
      "utf-8"
    );
    resetAnnuaireCache();
    const fights = await new CareersProvider({}).getCareer("canelo-alvarez");
    const mbilli = fights[0]!.fighters.find((f) => f.name === "Christian Mbilli")!;
    expect(mbilli.flag).toBe("🇫🇷");
    // le boxeur principal (Canelo) n'est pas dans l'annuaire → pas de drapeau
    expect(fights[0]!.fighters[0]!.flag).toBeUndefined();
  });
});

describe("boutToFight / mergeCareers", () => {
  const bout: WikipediaBout = {
    result: "Loss",
    opponent: "Tyson Fury",
    type: "SD",
    round: 12,
    date: "2024-12-21",
  };

  it("mappe un bout Wikipedia → Fight (boxeur en [0], adversaire en [1])", () => {
    const f = boutToFight("oleksandr-usyk", "Oleksandr Usyk", bout);
    expect(f.fighters.map((x) => x.name)).toEqual(["Oleksandr Usyk", "Tyson Fury"]);
    expect(f.outcome).toEqual({ winnerIndex: 1, method: "SD", round: 12 });
    expect(f.source).toBe("wikipedia");
    expect(f.status).toBe("finished");
  });

  it("dédup par (date + paires de noms) et tri date décroissante", () => {
    const a: Fight = {
      id: "x",
      date: "2024-05-18",
      status: "finished",
      fighters: [{ name: "Oleksandr Usyk" }, { name: "Tyson Fury" }],
      source: "ibf",
    };
    const b: Fight = {
      id: "y",
      date: "2024-05-18",
      status: "finished",
      fighters: [{ name: "Tyson Fury" }, { name: "Oleksandr Usyk" }], // ordre inversé
      source: "wikipedia",
    };
    const c: Fight = {
      id: "z",
      date: "2026-05-23",
      status: "finished",
      fighters: [{ name: "Oleksandr Usyk" }, { name: "Rico Verhoeven" }],
      source: "wikipedia",
    };
    const merged = mergeCareers([a, b], [c]);
    expect(merged.map((f) => f.id)).toEqual(["z", "x"]); // desc + a prime sur b
  });
});
