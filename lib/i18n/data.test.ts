import { describe, expect, it } from "vitest";
import {
  weightClassLabel,
  countryLabel,
  methodLabel,
  titleLabel,
} from "./data";

describe("weightClassLabel", () => {
  it("catégories FR canoniques → EN", () => {
    expect(weightClassLabel("Poids lourds", "en")).toBe("Heavyweight");
    expect(weightClassLabel("Poids super-moyens", "en")).toBe("Super Middleweight");
    expect(weightClassLabel("Poids mi-mouches", "en")).toBe("Light Flyweight");
  });

  it("locale fr → inchangé", () => {
    expect(weightClassLabel("Poids moyens", "fr")).toBe("Poids moyens");
  });

  it("inconnu → passthrough", () => {
    expect(weightClassLabel("Poids atomique", "en")).toBe("Poids atomique");
    expect(weightClassLabel("", "en")).toBe("");
  });
});

describe("countryLabel", () => {
  it("trouve la bonne entrée quelle que soit la forme (FR/EN)", () => {
    expect(countryLabel("United States", "fr")).toBe("États-Unis");
    expect(countryLabel("États-Unis", "en")).toBe("United States");
    expect(countryLabel("Ukraine", "fr")).toBe("Ukraine");
    expect(countryLabel("Mexico", "fr")).toBe("Mexique");
    expect(countryLabel("Mexique", "en")).toBe("Mexico");
    expect(countryLabel("Royaume-Uni", "en")).toBe("United Kingdom");
    expect(countryLabel("Dominican Republic", "fr")).toBe("République dominicaine");
  });

  it("insensible aux accents et à la casse", () => {
    expect(countryLabel("ETATS-UNIS", "fr")).toBe("États-Unis");
    expect(countryLabel("puerto rico", "fr")).toBe("Porto Rico");
  });

  it("inconnu → passthrough", () => {
    expect(countryLabel("Atlantide", "en")).toBe("Atlantide");
    expect(countryLabel("", "fr")).toBe("");
  });
});

describe("methodLabel", () => {
  it("Nul → Draw en EN", () => {
    expect(methodLabel("Nul", "en")).toBe("Draw");
    expect(methodLabel("Nul", "fr")).toBe("Nul");
  });

  it("sigles inchangés", () => {
    expect(methodLabel("TKO", "en")).toBe("TKO");
    expect(methodLabel("DQ", "en")).toBe("DQ");
    expect(methodLabel("RTD", "fr")).toBe("RTD");
  });
});

describe("titleLabel", () => {
  it("FR → EN : remplace les poids et les titres, garde les sigles", () => {
    expect(titleLabel("Ceinture WBC poids lourds", "en")).toContain("WBC");
    expect(titleLabel("Ceinture WBC poids lourds", "en")).toContain("heavyweight");
    expect(titleLabel("Ceinture WBC poids lourds", "en")).toContain("belt");
    expect(titleLabel("Champion du monde incontesté", "en")).toContain("undisputed");
    expect(titleLabel("Champion du monde incontesté", "en")).toContain("world champion");
  });

  it("les plus longues expressions avant les plus courtes", () => {
    // « champion du monde » ne doit pas être cassé par « champion » seul.
    expect(titleLabel("Champion du monde", "en")).toBe("world champion");
    expect(titleLabel("Champion du monde incontesté", "en")).toBe("undisputed world champion");
  });

  it("locale fr → inchangé", () => {
    expect(titleLabel("Ceinture WBC poids lourds", "fr")).toBe("Ceinture WBC poids lourds");
  });

  it("EN → FR", () => {
    expect(titleLabel("WBC Heavyweight Belt", "fr")).toBe("WBC Heavyweight Belt");
  });
});
