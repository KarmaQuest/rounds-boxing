import { describe, expect, it } from "vitest";
import type { Fight, Fighter } from "./types";
import {
  applyFilters,
  dedupeFighters,
  fightImportance,
  flagForCountry,
  fuzzyMatch,
  fuzzySuggest,
  koPct,
  levenshtein,
  matchesQuery,
  recordLabel,
  slugify,
  totalFights,
} from "./utils";

/** Fixture minimale de boxeur pour les tests de filtres. */
function mkFighter(partial: Partial<Fighter> & { name: string }): Fighter {
  return {
    id: `t-${slugify(partial.name)}`,
    slug: slugify(partial.name),
    country: "France",
    flag: "🇫🇷",
    weightClass: "Poids lourds",
    stance: "Orthodoxe",
    heightCm: 190,
    reachCm: 198,
    age: 30,
    debutYear: 2015,
    record: { wins: 20, losses: 1, draws: 0, ko: 10 },
    titles: [],
    ...partial,
  };
}

describe("slugify", () => {
  it("lowercase + tirets", () => {
    expect(slugify("Oleksandr Usyk")).toBe("oleksandr-usyk");
  });

  it("retire les accents", () => {
    expect(slugify("Canelo Álvarez")).toBe("canelo-alvarez");
    expect(slugify("Naoya Inoue")).toBe("naoya-inoue");
  });

  it("gère la ponctuation et les espaces multiples", () => {
    expect(slugify("  Jaron  \"Boots\" Ennis Jr. ")).toBe("jaron-boots-ennis-jr");
  });

  it("ne laisse pas de tirets en tête/queue", () => {
    expect(slugify("-Tony- Yoka-")).toBe("tony-yoka");
  });
});

describe("flagForCountry", () => {
  it("mappe les pays connus (FR/EN)", () => {
    expect(flagForCountry("France")).toBe("🇫🇷");
    expect(flagForCountry("france")).toBe("🇫🇷");
    expect(flagForCountry("États-Unis")).toBe("🇺🇸");
    expect(flagForCountry("United States")).toBe("🇺🇸");
    expect(flagForCountry("Ukraine")).toBe("🇺🇦");
  });

  it("retourne le globe pour les inconnus / vides", () => {
    expect(flagForCountry("Atlantide")).toBe("🌍");
    expect(flagForCountry("")).toBe("🌍");
    expect(flagForCountry(undefined)).toBe("🌍");
  });
});

describe("koPct / recordLabel / totalFights", () => {
  it("calcule le % de KO arrondi", () => {
    expect(koPct({ wins: 23, losses: 0, draws: 0, ko: 14 })).toBe(61); // 14/23 = 60.8
    expect(koPct({ wins: 0, losses: 0, draws: 0, ko: 0 })).toBe(0);
  });

  it("formate le palmarès", () => {
    expect(recordLabel({ wins: 23, losses: 0, draws: 0, ko: 14 })).toBe("23-0-0");
    expect(totalFights({ wins: 23, losses: 0, draws: 0, ko: 14 })).toBe(23);
  });
});

describe("matchesQuery", () => {
  const usyk = mkFighter({ name: "Oleksandr Usyk", nickname: "The Cat", country: "Ukraine" });

  it("insensible aux accents et à la casse", () => {
    expect(matchesQuery(usyk, "usyk")).toBe(true);
    expect(matchesQuery(usyk, "USYK")).toBe(true);
    expect(matchesQuery(usyk, "oléksandr")).toBe(true);
  });

  it("cherche aussi dans le surnom et le pays", () => {
    expect(matchesQuery(usyk, "cat")).toBe(true);
    expect(matchesQuery(usyk, "ukraine")).toBe(true);
  });

  it("rejette ce qui ne correspond pas", () => {
    expect(matchesQuery(usyk, "canelo")).toBe(false);
  });
});

describe("applyFilters", () => {
  const fighters = [
    mkFighter({
      name: "Oleksandr Usyk",
      country: "Ukraine",
      weightClass: "Poids lourds",
      rank: 1,
      record: { wins: 23, losses: 0, draws: 0, ko: 14 },
    }),
    mkFighter({
      name: "Canelo Álvarez",
      country: "Mexique",
      weightClass: "Poids super-moyens",
      rank: 4,
      record: { wins: 62, losses: 2, draws: 2, ko: 39 },
    }),
    mkFighter({
      name: "Christian Mbilli",
      country: "France",
      weightClass: "Poids super-moyens",
      rank: 21,
      record: { wins: 29, losses: 0, draws: 0, ko: 24 },
    }),
    mkFighter({
      name: "Tony Yoka",
      country: "France",
      weightClass: "Poids lourds",
      rank: 24,
      record: { wins: 13, losses: 3, draws: 0, ko: 9 },
    }),
  ];

  it("applique l'offset (pagination — TASKS 2.1)", () => {
    const page1 = applyFilters(fighters, { limit: 2, offset: 0 });
    const page2 = applyFilters(fighters, { limit: 2, offset: 2 });
    expect(page1.map((f) => f.slug)).toEqual([
      "oleksandr-usyk",
      "canelo-alvarez",
    ]);
    expect(page2.map((f) => f.slug)).toEqual([
      "christian-mbilli",
      "tony-yoka",
    ]);
  });

  it("ne filtre rien par défaut et garde l'ordre", () => {
    const out = applyFilters(fighters, {});
    expect(out).toHaveLength(4);
    expect(out.map((f) => f.slug)).toEqual([
      "oleksandr-usyk",
      "canelo-alvarez",
      "christian-mbilli",
      "tony-yoka",
    ]);
  });

  it("filtre par recherche (accents ignorés)", () => {
    const out = applyFilters(fighters, { q: "canelo" });
    expect(out.map((f) => f.name)).toEqual(["Canelo Álvarez"]);
  });

  it("filtre par catégorie de poids", () => {
    const out = applyFilters(fighters, { weightClass: "Poids super-moyens" });
    expect(out.map((f) => f.name)).toEqual(["Canelo Álvarez", "Christian Mbilli"]);
  });

  it("filtre par pays (insensible à la casse)", () => {
    const out = applyFilters(fighters, { country: "FRANCE" });
    expect(out.map((f) => f.name)).toEqual(["Christian Mbilli", "Tony Yoka"]);
  });

  it("filtre par victoires minimum", () => {
    const out = applyFilters(fighters, { minWins: 30 });
    expect(out.map((f) => f.name)).toEqual(["Canelo Álvarez"]);
  });

  it("filtre par % de KO minimum", () => {
    const out = applyFilters(fighters, { minKoPct: 70 });
    // 39/66 = 59 %, 14/23 = 61 %, 24/29 = 83 %, 9/16 = 56 %
    expect(out.map((f) => f.name)).toEqual(["Christian Mbilli"]);
  });

  it("combine les critères", () => {
    const out = applyFilters(fighters, { weightClass: "Poids lourds", minWins: 15 });
    expect(out.map((f) => f.name)).toEqual(["Oleksandr Usyk"]);
  });

  it("trie par nom", () => {
    const out = applyFilters(fighters, { sort: "name" });
    expect(out.map((f) => f.name)).toEqual([
      "Canelo Álvarez",
      "Christian Mbilli",
      "Oleksandr Usyk",
      "Tony Yoka",
    ]);
  });

  it("trie par victoires (desc)", () => {
    const out = applyFilters(fighters, { sort: "wins" });
    expect(out[0]!.name).toBe("Canelo Álvarez");
    expect(out[out.length - 1]!.name).toBe("Tony Yoka");
  });

  it("trie par % KO (desc)", () => {
    const out = applyFilters(fighters, { sort: "koPct" });
    expect(out[0]!.name).toBe("Christian Mbilli");
  });

  it("trie par âge (asc)", () => {
    const out = applyFilters(fighters, { sort: "age" });
    expect(out.map((f) => f.age)).toEqual([...out.map((f) => f.age)].sort((a, b) => a - b));
  });

  it("trie par taille (desc)", () => {
    const out = applyFilters(fighters, { sort: "height" });
    expect(out.map((f) => f.heightCm)).toEqual([...out.map((f) => f.heightCm)].sort((a, b) => b - a));
  });

  it("trie par rang par défaut (les sans-rang en dernier)", () => {
    const withNoRank = [...fighters, mkFighter({ name: "Sans Rang", rank: undefined })];
    const out = applyFilters(withNoRank, {});
    expect(out[out.length - 1]!.name).toBe("Sans Rang");
  });

  it("applique la limite", () => {
    const out = applyFilters(fighters, { limit: 2 });
    expect(out).toHaveLength(2);
  });
});

describe("levenshtein / recherche floue", () => {
  it("calcule la distance d'édition", () => {
    expect(levenshtein("usyk", "usyk")).toBe(0);
    expect(levenshtein("uzyk", "usyk")).toBe(1);
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("chat", "chien")).toBe(3);
  });

  it("« uzyk » trouve Oleksandr Usyk (TASKS 1.3)", () => {
    expect(fuzzyMatch("uzyk", "oleksandr usyk the cat ukraine")).toBe(true);
    expect(fuzzyMatch("canlo", "canelo alvarez")).toBe(true); // 1 faute
    expect(fuzzyMatch("canelo", "canelo alvarez")).toBe(true);
  });

  it("rejette ce qui ne correspond pas", () => {
    expect(fuzzyMatch("sushi", "oleksandr usyk")).toBe(false);
  });

  it("fuzzySuggest classe les meilleurs résultats d'abord", () => {
    const usyk = mkFighter({ name: "Oleksandr Usyk" });
    const canelo = mkFighter({ name: "Canelo Álvarez" });
    const out = fuzzySuggest([canelo, usyk], "uzyk", 5);
    expect(out[0]!.name).toBe("Oleksandr Usyk");
  });
});

describe("fightImportance (TASKS 1.4)", () => {
  const mkFight = (partial: Partial<Fight> & { id: string }): Fight => ({
    date: "2026-09-13",
    status: "upcoming",
    fighters: [{ name: "A" }, { name: "B" }],
    ...partial, // id (requis) et tout override arrivent ici
  });

  it("surligne les superfights (titre + cotes serrées + boxeurs connus)", () => {
    const big = mkFight({
      id: "big",
      title: "Championnat incontesté des lourds",
      location: "Riyad, Arabie saoudite",
      odds: [1.9, 1.88],
      fighters: [
        { name: "Usyk", record: { wins: 23, losses: 0, draws: 0, ko: 14 } },
        { name: "Fury", record: { wins: 34, losses: 2, draws: 1, ko: 24 } },
      ],
    });
    const small = mkFight({
      id: "small",
      title: undefined,
      odds: [1.05, 10],
      fighters: [{ name: "A" }, { name: "B" }],
    });
    expect(fightImportance(big)).toBeGreaterThan(fightImportance(small));
  });
});

describe("dedupeFighters", () => {
  it("retire les doublons par slug en gardant la première occurrence", () => {
    const a = mkFighter({ name: "Oleksandr Usyk", record: { wins: 23, losses: 0, draws: 0, ko: 14 } });
    const b = mkFighter({ name: "Oleksandr Usyk", record: { wins: 99, losses: 0, draws: 0, ko: 90 } });
    const out = dedupeFighters([a, b, a]);
    expect(out).toHaveLength(1);
    expect(out[0]!.record.wins).toBe(23);
  });
});
