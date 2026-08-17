import { describe, expect, it } from "vitest";
import {
  heightToCm,
  parseBoxerCareer,
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

/** Extrait réaliste du tableau « Professional boxing record » d'Usyk (en). */
const CAREER_USYK = `==Professional boxing record==
<!--DO NOT ADD UPCOMING FIGHTS-->
{{BoxingRecordSummary
|draws=
|nc=
|ko-wins=16
|ko-losses=
|dec-wins=9
|dec-losses=
}}
{|class="wikitable" style="text-align:center"
|-
|-<!--comment-->
!{{abbr|No.|Number}}
!Result
!Record
!Opponent
!Type
!Round, time
!Date
!Location
!Notes
|-
|25
|{{yes2}}Win
|25\u20130
|style="text-align:left;"|[[Rico Verhoeven]]
|TKO
|11 (12), {{small|2:59}}
|23 May 2026
|style="text-align:left;"|{{small|[[Pyramids of Giza]], [[Giza]], Egypt}}
|style="text-align:left;"|{{small|Retained WBA (Super), WBC, and ''The Ring'' heavyweight titles}}
|-
|24
|{{yes2}}Win
|24\u20130
|style="text-align:left;"|[[Daniel Dubois]]
|KO
|5 (12), {{small|1:52}}
|[[Oleksandr Usyk vs. Daniel Dubois II|19 Jul 2025]]
|style="text-align:left;"|{{small|[[Wembley Stadium]], London, England}}
|style="text-align:left;"|{{small|Retained WBA (Super), WBC, WBO, IBO, and ''The Ring'' heavyweight titles; Won IBF heavyweight title}}
|-
|23
|{{yes2}}Win
|23\u20130
|style="text-align:left;"|[[Tyson Fury]]
|UD
|12
|18 May 2024
|style="text-align:left;"|{{small|Kingdom Arena, Riyadh, Saudi Arabia}}
|style="text-align:left;"|{{small|Retained WBA (Super), IBF, WBO, IBO, and ''The Ring'' heavyweight titles; Won [[List of WBC world champions#Heavyweight|WBC heavyweight title]]}}
|-
|22
|{{no2}}Loss
|21\u20131
|style="text-align:left;"|[[Tyson Fury]]
|SD
|12
|21 Dec 2024
|style="text-align:left;"|{{small|Kingdom Arena, Riyadh, Saudi Arabia}}
|style="text-align:left;"|{{small|Lost WBA (Super), WBC, WBO, IBF heavyweight titles}}
|-
|21
|{{draw}}Draw
|21\u20130\u20131
|style="text-align:left;"|[[Tyson Fury]]
|MD
|12
|16 Aug 2025
|style="text-align:left;"|{{small|Kingdom Arena, Riyadh, Saudi Arabia}}
|style="text-align:left;"|{{small|Retained WBA (Super), WBC, WBO, IBF heavyweight titles}}
|}

==Early life==
Some text.
`;

describe("parseBoxerCareer", () => {
  it("parse le palmarès complet (en), du plus récent au plus ancien", () => {
    const bouts = parseBoxerCareer(CAREER_USYK);
    expect(bouts).toHaveLength(5);
    // premier combat = le plus récent (Rico Verhoeven)
    expect(bouts[0]).toMatchObject({
      result: "Win",
      opponent: "Rico Verhoeven",
      type: "TKO",
      round: 11,
      date: "2026-05-23",
      location: "Pyramids of Giza, Giza, Egypt",
      title: "Titre WBA, WBC, The Ring",
    });
    // date en lien wiki → libellé extrait
    expect(bouts[1]).toMatchObject({ opponent: "Daniel Dubois", date: "2025-07-19" });
    // défaite → result Loss, vainqueur = adversaire
    expect(bouts[3]).toMatchObject({ result: "Loss", opponent: "Tyson Fury", type: "SD", round: 12, date: "2024-12-21" });
    // nul → result Draw
    expect(bouts[4]).toMatchObject({ result: "Draw", type: "MD", date: "2025-08-16", round: 12 });
  });

  it("pas de section palmarès → []", () => {
    expect(parseBoxerCareer("{{Infobox boxer\n| name = X\n}}")).toEqual([]);
    expect(parseBoxerCareer("")).toEqual([]);
  });

  it("format de date mois-jour-année (« Sep 13, 2025 ») → ISO", () => {
    const wt = `==Professional boxing record==
{|class="wikitable"
|-
!No.!!Result!!Record!!Opponent!!Type!!Round!!Date!!Location
|-
|42
|{{yes2}}Win
|42\u20130
|style="text-align:left;"|[[Canelo Álvarez]]
|UD
|12
|[[Canelo Álvarez vs. Terence Crawford|Sep 13, 2025]]
|style="text-align:left;"|{{small|Allegiant Stadium, Paradise, Nevada, U.S.}}
|}
`;
    const bouts = parseBoxerCareer(wt);
    expect(bouts).toHaveLength(1);
    expect(bouts[0]!.date).toBe("2025-09-13");
    expect(bouts[0]!.opponent).toBe("Canelo Álvarez");
  });

  it("lignes TBD/TBA ou dates illisibles → ignorées", () => {
    const wt = `==Professional boxing record==
{|class="wikitable"
|-
!No.!!Result!!Record!!Opponent!!Type!!Round!!Date!!Location
|-
|1
|{{yes2}}Win
|1\u20130
|style="text-align:left;"|[[John Doe]]
|KO
|2 (4)
|15 Feb 2026
|Las Vegas, Nevada
|-
|2
|{{N/A}}
|1\u20130
|style="text-align:left;"|TBD
|\u2013
|\u2013
|TBA
|\u2013
|}
`;
    const bouts = parseBoxerCareer(wt);
    expect(bouts).toHaveLength(1);
    expect(bouts[0]).toMatchObject({ opponent: "John Doe", date: "2026-02-15" });
  });
});
