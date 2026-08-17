import { describe, expect, it } from "vitest";
import { flagForCountry, fuzzyMatch } from "./utils";

describe("flagForCountry", () => {
  it("noms exacts du dictionnaire", () => {
    expect(flagForCountry("France")).toBe("🇫🇷");
    expect(flagForCountry("Ukraine")).toBe("🇺🇦");
    expect(flagForCountry("United States")).toBe("🇺🇸");
  });

  it("fragments Big Balls (« Kingdom of … » / « Royaume des … »)", () => {
    expect(flagForCountry("Kingdom of the Netherlands")).toBe("🇳🇱");
    expect(flagForCountry("Royaume des Pays-Bas")).toBe("🇳🇱");
    expect(flagForCountry("Kingdom of Denmark")).toBe("🇩🇰");
    expect(flagForCountry("Kingdom of Norway")).toBe("🇳🇴");
    expect(flagForCountry("United States of America")).toBe("🇺🇸");
    expect(flagForCountry("Russian Federation")).toBe("🇷🇺");
  });

  it("inconnu → globe", () => {
    expect(flagForCountry("")).toBe("🌍");
    expect(flagForCountry("Atlantide")).toBe("🌍");
    expect(flagForCountry(undefined)).toBe("🌍");
  });
});

describe("fuzzyMatch", () => {
  it("typo « uzyk » → trouve Usyk", () => {
    expect(fuzzyMatch("uzyk", "Oleksandr Usyk")).toBe(true);
  });
  it("requête sans rapport → non", () => {
    expect(fuzzyMatch("bakary samake", "Oleksandr Usyk")).toBe(false);
  });
});
