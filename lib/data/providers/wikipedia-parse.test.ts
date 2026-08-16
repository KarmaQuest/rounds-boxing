import { describe, expect, it } from "vitest";
import {
  heightToCm,
  parseBoxerInfobox,
  reachToCm,
  stanceNormalize,
  weightClassNormalize,
} from "./wikipedia-parse";

const INFOBOX_FR_CANELO = `{{Infobox Boxeur
 | nom                    = Saúl "Canelo" Álvarez
 | surnom                 = ''Canelo''
 | nationalité            = {{MEX}}
 | date de naissance      = {{date de naissance|18|7|1990|âge=oui}}
 | catégorie              = [[Poids super-légers]] à [[poids mi-lourds]]
 | style                  = Garde orthodoxe
 | taille                 = {{taille|m=1.71}}
 | allonge                = {{taille|m=1.79}}
 | combats                = 68
 | victoires              = 63
 | KO                     = 39
 | défaites               = 3
 | matchs nuls            = 2
 | titres                 = Champion du monde
}}`;

const INFOBOX_EN_USYK = `{{Infobox boxer
| name = Oleksandr Usyk
| nickname = The Cat
| weight = Heavyweight
| height = 6 ft 3 in
| reach = 78 in
| nationality = Ukrainian
| stance = Southpaw
| total = 25
| wins = 25
| KO = 16
| losses = 0
| draws = 0
}}`;

describe("heightToCm", () => {
  it("template {{taille|m=…}}", () => {
    expect(heightToCm("{{taille|m=1.71}}")).toBe(171);
  });
  it("mètres simples", () => {
    expect(heightToCm("1.71 m")).toBe(171);
  });
  it("centimètres", () => {
    expect(heightToCm("178 cm")).toBe(178);
  });
  it("pieds + pouces", () => {
    expect(heightToCm("6 ft 3 in")).toBe(191);
    expect(heightToCm("5 ft 8 in")).toBe(173);
    expect(heightToCm("5 ft 8+1/2 in")).toBe(174);
  });
  it("vide → null", () => {
    expect(heightToCm("")).toBeNull();
  });
});

describe("reachToCm", () => {
  it("pouces", () => {
    expect(reachToCm("78 in")).toBe(198);
  });
  it("pouces + fraction (68+1/2 in → 174 cm, pas 5)", () => {
    expect(reachToCm("68+1/2 in")).toBe(174);
  });
  it("pieds + pouces", () => {
    expect(reachToCm("5 ft 8 in")).toBe(173);
  });
  it("template", () => {
    expect(reachToCm("{{taille|m=1.79}}")).toBe(179);
  });
  it("vide → null", () => {
    expect(reachToCm("")).toBeNull();
  });
});

describe("stanceNormalize", () => {
  it("fr et en", () => {
    expect(stanceNormalize("Garde orthodoxe")).toBe("Orthodoxe");
    expect(stanceNormalize("Orthodox")).toBe("Orthodoxe");
    expect(stanceNormalize("Southpaw")).toBe("Southpaw");
    expect(stanceNormalize("Gaucher")).toBe("Southpaw");
    expect(stanceNormalize("Fausse patte")).toBe("Southpaw");
  });
  it("inconnu → null", () => {
    expect(stanceNormalize("Peau de banane")).toBeNull();
  });
});

describe("weightClassNormalize", () => {
  it("fr direct", () => {
    expect(weightClassNormalize("Poids lourds")).toBe("Poids lourds");
    expect(weightClassNormalize("poids moyens")).toBe("Poids moyens");
  });
  it("en traduit", () => {
    expect(weightClassNormalize("Light heavyweight")).toBe("Poids mi-lourds");
    expect(weightClassNormalize("Super middleweight")).toBe("Poids super-moyens");
    expect(weightClassNormalize("Heavyweight")).toBe("Poids lourds");
  });
  it("inconnu → null", () => {
    expect(weightClassNormalize("Poids girafe")).toBeNull();
  });
});

describe("parseBoxerInfobox", () => {
  it("parse l'infobox française (Canelo)", () => {
    const out = parseBoxerInfobox(INFOBOX_FR_CANELO);
    expect(out).not.toBeNull();
    expect(out!.record).toEqual({ wins: 63, losses: 3, draws: 2, ko: 39 });
    expect(out!.heightCm).toBe(171);
    expect(out!.reachCm).toBe(179);
    expect(out!.stance).toBe("Orthodoxe");
    expect(out!.nickname).toBe("Canelo");
  });

  it("parse l'infobox anglaise (Usyk)", () => {
    const out = parseBoxerInfobox(INFOBOX_EN_USYK);
    expect(out).not.toBeNull();
    expect(out!.record).toEqual({ wins: 25, losses: 0, draws: 0, ko: 16 });
    expect(out!.heightCm).toBe(191);
    expect(out!.reachCm).toBe(198);
    expect(out!.stance).toBe("Southpaw");
    expect(out!.weightClass).toBe("Poids lourds");
    expect(out!.nickname).toBe("The Cat");
  });

  it("pas d'infobox → null", () => {
    expect(parseBoxerInfobox("pas de template ici")).toBeNull();
    expect(parseBoxerInfobox("")).toBeNull();
  });

  it("infobox sans record boxeur → null", () => {
    expect(parseBoxerInfobox("{{Infobox Personne\n | nom = Jean\n}}")).toBeNull();
  });

  it("infobox abrégée : total présent → défaites déduites (10 combats, 9 victoires → 1 défaite)", () => {
    const out = parseBoxerInfobox(
      "{{Infobox Boxeur\n | combats = 10\n | victoires = 9\n}}"
    );
    expect(out!.record).toEqual({ wins: 9, losses: 1, draws: 0 });
  });

  it("défaites vides (invaincu) → 0, comme la convention des infobox fr", () => {
    const out = parseBoxerInfobox(
      "{{Infobox Boxeur\n | combats = 25\n | victoires = 25\n | KO = 16\n | défaites = \n | matchs nuls = \n}}"
    );
    expect(out!.record).toEqual({ wins: 25, losses: 0, draws: 0, ko: 16 });
  });

  it("champs multi-lignes {{plainlist|…}} (EN) : surnom → 1er item, catégorie → dernier (classe actuelle)", () => {
    const out = parseBoxerInfobox(
      `{{Infobox boxer\n| name = Some Fighter\n| nickname = {{plainlist|\n* \"The Beast\"\n* \"The Animal\"\n}}\n| weight = {{plainlist|\n* [[Cruiserweight]]\n* [[Heavyweight]]\n}}\n| height = 6 ft 3 in\n| reach = 78 in\n| stance = [[Orthodox stance|Orthodox]]\n| total = 25\n| wins = 25\n| losses = 0\n| draws = 0\n| KO = 16\n}}`
    );
    expect(out!.nickname).toBe("The Beast");
    expect(out!.weightClass).toBe("Poids lourds");
    expect(out!.stance).toBe("Orthodoxe");
  });

  it("catégorie EN avec tiret (Light-heavyweight) → traduite", () => {
    expect(weightClassNormalize("[[Light-heavyweight]]")).toBe("Poids mi-lourds");
  });
});
