import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Fighter, Fight } from "../types";
import { slugify } from "../utils";
import type { DataProvider } from "./provider";
import { ProviderRouter, RateLimitedError, fetchJson } from "./router";

/**
 * Tests du ProviderRouter — l'épine dorsale de la stratégie multi-API.
 *
 * Le cache et le quota sont mockés pour rendre chaque scénario déterministe :
 * on vérifie ici la FUSION (dédup, enrichissement mock, cotes réelles en
 * priorité), le QUOTA épuisé, le CIRCUIT breaker, et le CACHE TTL.
 */

const mocks = vi.hoisted(() => ({
  cache: { get: vi.fn(), set: vi.fn() },
  quota: {
    isAvailable: vi.fn(),
    consume: vi.fn(),
    recordSuccess: vi.fn(),
    recordFailure: vi.fn(),
    usage: vi.fn(),
  },
}));

vi.mock("../cache", () => ({
  cache: mocks.cache,
  TTL: {
    fighter: 60_000,
    search: 60_000,
    upcomingFights: 60_000,
    recentFights: 60_000,
  },
}));

vi.mock("../quota", () => ({
  quota: mocks.quota,
}));

// ── Helpers ────────────────────────────────────────────────────────────

function mkFighter(partial: Partial<Fighter> & { name: string }): Fighter {
  const slug = partial.slug ?? slugify(partial.name);
  return {
    id: `t-${slug}`,
    slug,
    country: "France",
    flag: "🇫🇷",
    weightClass: "Poids lourds",
    stance: "Orthodoxe",
    heightCm: 190,
    reachCm: 198,
    age: 30,
    debutYear: 2015,
    record: { wins: 10, losses: 0, draws: 0, ko: 5 },
    titles: [],
    ...partial, // name (requis) et tout override arrivent ici
  };
}

function mkFight(partial: Partial<Fight> & { id: string }): Fight {
  return {
    date: "2031-01-01", // date future par défaut → passe le filtre upcoming
    status: "upcoming",
    fighters: [{ name: "Canelo Álvarez" }, { name: "Terence Crawford" }],
    ...partial, // id (requis) et tout override arrivent ici
  };
}

type ProviderOverrides = Partial<DataProvider> & { name: string };

function mkProvider(o: ProviderOverrides): DataProvider {
  const empty = async (): Promise<never[]> => [];
  return {
    name: o.name,
    priority: o.priority ?? 10,
    capabilities: o.capabilities ?? ["fighters"],
    dailyLimit: o.dailyLimit ?? 0,
    isActive: o.isActive ?? (() => true),
    searchFighters: o.searchFighters ?? empty,
    listFighters: o.listFighters ?? empty,
    getFighter: o.getFighter ?? (async () => null),
    getUpcomingFights: o.getUpcomingFights ?? empty,
    getRecentFights: o.getRecentFights ?? empty,
  };
}

const usykReal = mkFighter({
  name: "Oleksandr Usyk",
  country: "Ukraine",
  record: { wins: 0, losses: 0, draws: 0, ko: 0 }, // Big Balls → record null
  boxrecId: "570203",
});

const usykMock = mkFighter({
  name: "Oleksandr Usyk",
  country: "Ukraine",
  record: { wins: 23, losses: 0, draws: 0, ko: 14 },
  titles: ["Champion incontesté des lourds"],
  rank: 1,
  bio: "Premier champion incontesté des lourds.",
  promoter: "K2 Promotions",
});

beforeEach(() => {
  mocks.cache.get.mockReset().mockResolvedValue(undefined);
  mocks.cache.set.mockReset().mockResolvedValue(undefined);
  mocks.quota.isAvailable.mockReset().mockResolvedValue(true);
  mocks.quota.consume.mockReset().mockResolvedValue(true);
  mocks.quota.recordSuccess.mockReset().mockResolvedValue(undefined);
  mocks.quota.recordFailure.mockReset().mockResolvedValue(undefined);
  mocks.quota.usage.mockReset().mockResolvedValue({ used: 0, limit: 0 });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── Fusion boxeurs ─────────────────────────────────────────────────────

describe("listFighters — fusion multi-source", () => {
  it("déduplique par slug et laisse le mock enrichir la source réelle", async () => {
    const router = new ProviderRouter([
      mkProvider({
        name: "bigballs",
        priority: 1,
        listFighters: async () => [usykReal],
      }),
      mkProvider({ name: "mock", priority: 99, listFighters: async () => [usykMock] }),
    ]);

    const { fighters, source } = await router.listFighters();

    expect(fighters).toHaveLength(1);
    const f = fighters[0]!;
    expect(f.record).toEqual({ wins: 23, losses: 0, draws: 0, ko: 14 }); // mock enrichit
    expect(f.boxrecId).toBe("570203"); // ID BoxRec réel préservé
    expect(f.titles).toEqual(["Champion incontesté des lourds"]);
    expect(f.bio).toBe("Premier champion incontesté des lourds.");
    expect(f.rank).toBe(1);
    expect(source).toBe("bigballs + mock");
  });

  it("les données physiques d'une source réelle priment ; le mock ne les écrase pas (ni par undefined)", async () => {
    const real = mkFighter({
      name: "Oleksandr Usyk",
      heightCm: 191,
      reachCm: 198,
      stance: "Southpaw",
      nickname: "The Cat",
      record: { wins: 25, losses: 0, draws: 0, ko: 16 },
    });
    const mock = mkFighter({
      name: "Oleksandr Usyk",
      heightCm: 190, // valeur différente → ne doit pas écraser 191
      stance: "Orthodoxe", // ne doit pas écraser Southpaw
      reachCm: undefined, // champ absent → ne doit pas écraser par undefined
      record: { wins: 25, losses: 0, draws: 0, ko: 16 },
    });

    const router = new ProviderRouter([
      mkProvider({ name: "bigballs", priority: 1, listFighters: async () => [real] }),
      mkProvider({ name: "mock", priority: 99, listFighters: async () => [mock] }),
    ]);

    const { fighters } = await router.listFighters();
    expect(fighters[0]!.heightCm).toBe(191); // la source réelle prime
    expect(fighters[0]!.stance).toBe("Southpaw");
    expect(fighters[0]!.reachCm).toBe(198); // pas écrasé par undefined
    expect(fighters[0]!.nickname).toBe("The Cat");
  });

  it("une fiche minimale (Wikipedia) ne doit pas écraser les champs de la source réelle (Big Balls)", async () => {
    const bigballs = mkFighter({
      name: "Bakary Samaké",
      country: "France",
      heightCm: 180,
      bio: "Champion de France super-welters.",
      record: { wins: 0, losses: 0, draws: 0, ko: 0 },
    });
    // fiche Wikipedia minimale : record réel, mais pas de bio/pays/taille
    const wikipedia = mkFighter({
      name: "Bakary Samaké",
      country: "",
      flag: "",
      heightCm: 0,
      reachCm: 0,
      bio: undefined,
      record: { wins: 19, losses: 1, draws: 0, ko: 11 },
      source: "wikipedia",
    });

    const router = new ProviderRouter([
      mkProvider({ name: "bigballs", priority: 1, listFighters: async () => [bigballs] }),
      mkProvider({ name: "wikipedia", priority: 2, listFighters: async () => [wikipedia] }),
    ]);

    const { fighters } = await router.listFighters();
    const f = fighters[0]!;
    expect(f.record).toEqual({ wins: 19, losses: 1, draws: 0, ko: 11 }); // record réel Wikipedia
    expect(f.country).toBe("France"); // champ Big Balls préservé
    expect(f.heightCm).toBe(180); // pas écrasé par 0
    expect(f.bio).toBe("Champion de France super-welters.");
    expect(f.source).toBe("wikipedia"); // le label suit le palmarès retenu
  });

  it("le palmarès d'une source réelle prime dès qu'il contient des combats (recordPriority)", async () => {
    const real = mkFighter({
      name: "Oleksandr Usyk",
      record: { wins: 25, losses: 0, draws: 0, ko: 15 },
    });
    const router = new ProviderRouter([
      mkProvider({ name: "bigballs", priority: 1, listFighters: async () => [real] }),
      mkProvider({ name: "mock", priority: 99, listFighters: async () => [usykMock] }),
    ]);

    const { fighters } = await router.listFighters();
    expect(fighters[0]!.record.wins).toBe(25);
  });

  it("ignore les providers inactifs", async () => {
    const router = new ProviderRouter([
      mkProvider({ name: "inactif", priority: 1, isActive: () => false, listFighters: async () => [usykReal] }),
      mkProvider({ name: "mock", priority: 99, listFighters: async () => [usykMock] }),
    ]);

    const { source } = await router.listFighters();
    expect(source).toBe("mock");
  });

  it("retourne 'aucune' quand rien ne répond", async () => {
    const router = new ProviderRouter([mkProvider({ name: "vide" })]);
    const { fighters, source } = await router.listFighters();
    expect(fighters).toEqual([]);
    expect(source).toBe("aucune");
  });
});

// ── Quota & circuit breaker ────────────────────────────────────────────

describe("quota et circuit breaker", () => {
  it("saute un provider dont le quota quotidien est épuisé", async () => {
    mocks.quota.isAvailable.mockResolvedValue(false);
    const list = vi.fn(async () => [usykMock]);

    const router = new ProviderRouter([
      mkProvider({ name: "bigballs", priority: 1, dailyLimit: 1000, listFighters: list }),
      mkProvider({ name: "mock", priority: 99, listFighters: async () => [usykMock] }),
    ]);

    const { source } = await router.listFighters();
    expect(list).not.toHaveBeenCalled();
    expect(mocks.quota.consume).not.toHaveBeenCalled();
    expect(source).toBe("mock");
  });

  it("ne consomme pas le quota pour un provider illimité (dailyLimit 0)", async () => {
    const router = new ProviderRouter([
      mkProvider({ name: "mock", priority: 99, dailyLimit: 0, listFighters: async () => [usykMock] }),
    ]);

    await router.listFighters();
    expect(mocks.quota.isAvailable).not.toHaveBeenCalled();
    expect(mocks.quota.consume).not.toHaveBeenCalled();
  });

  it("saute un provider si la consommation est refusée (course)", async () => {
    mocks.quota.consume.mockResolvedValue(false);
    const list = vi.fn(async () => [usykMock]);

    const router = new ProviderRouter([
      mkProvider({ name: "bigballs", priority: 1, dailyLimit: 10, listFighters: list }),
      mkProvider({ name: "mock", priority: 99, listFighters: async () => [usykMock] }),
    ]);

    await router.listFighters();
    expect(list).not.toHaveBeenCalled();
  });

  it("une erreur provider n'arrête pas le routeur et ouvre le circuit via recordFailure", async () => {
    const failing = vi.fn(async () => {
      throw new Error("HTTP 500 — boom");
    });

    const router = new ProviderRouter([
      mkProvider({ name: "fragile", priority: 1, dailyLimit: 100, listFighters: failing }),
      mkProvider({ name: "mock", priority: 99, listFighters: async () => [usykMock] }),
    ]);

    const { fighters, source } = await router.listFighters();
    expect(fighters).toHaveLength(1);
    expect(source).toBe("mock");
    expect(mocks.quota.recordFailure).toHaveBeenCalledWith("fragile", false);
  });

  it("un 429 est signalé comme rate-limited (circuit immédiat)", async () => {
    const router = new ProviderRouter([
      mkProvider({
        name: "quotaapi",
        priority: 1,
        dailyLimit: 100,
        listFighters: async () => {
          throw new RateLimitedError("quotaapi");
        },
      }),
      mkProvider({ name: "mock", priority: 99, listFighters: async () => [usykMock] }),
    ]);

    await router.listFighters();
    expect(mocks.quota.recordFailure).toHaveBeenCalledWith("quotaapi", true);
  });

  it("enregistre un succès quand le provider répond", async () => {
    const router = new ProviderRouter([
      mkProvider({ name: "bigballs", priority: 1, dailyLimit: 100, listFighters: async () => [usykReal] }),
    ]);

    await router.listFighters();
    expect(mocks.quota.recordSuccess).toHaveBeenCalledWith("bigballs");
  });
});

// ── Cache TTL ──────────────────────────────────────────────────────────

describe("cache TTL", () => {
  it("un cache hit évite de rappeler le provider", async () => {
    mocks.cache.get.mockResolvedValue([usykMock]);
    const list = vi.fn(async () => [usykReal]);

    const router = new ProviderRouter([
      mkProvider({ name: "bigballs", priority: 1, listFighters: list }),
    ]);

    const { fighters } = await router.listFighters();
    expect(list).not.toHaveBeenCalled();
    expect(fighters).toHaveLength(1);
    expect(mocks.cache.set).not.toHaveBeenCalled();
  });

  it("un cache miss stocke la réponse avec le bon TTL", async () => {
    const router = new ProviderRouter([
      mkProvider({ name: "bigballs", priority: 1, listFighters: async () => [usykReal] }),
    ]);

    await router.listFighters();
    expect(mocks.cache.set).toHaveBeenCalledWith(
      "bigballs:list:200",
      [usykReal],
      60_000 // TTL.search
    );
  });
});

// ── searchFighters / getFighter ────────────────────────────────────────

describe("searchFighters et getFighter", () => {
  it("cherche dans toutes les sources actives et fusionne", async () => {
    const router = new ProviderRouter([
      mkProvider({ name: "bigballs", priority: 1, searchFighters: async () => [usykReal] }),
      mkProvider({ name: "thesportsdb", priority: 2, searchFighters: async () => [usykMock] }),
    ]);

    const { fighters, source } = await router.searchFighters("usyk");
    expect(fighters).toHaveLength(1);
    expect(fighters[0]!.record.wins).toBe(23);
    expect(source).toBe("bigballs + thesportsdb");
  });

  it("getFighter fusionne les fiches de plusieurs sources", async () => {
    const router = new ProviderRouter([
      mkProvider({ name: "bigballs", priority: 1, getFighter: async () => usykReal }),
      mkProvider({ name: "mock", priority: 99, getFighter: async () => usykMock }),
    ]);

    const { fighter, source } = await router.getFighter("oleksandr-usyk");
    expect(fighter).not.toBeNull();
    expect(fighter!.record.wins).toBe(23);
    expect(source).toBe("bigballs + mock");
  });

  it("getFighter renvoie null quand personne ne connaît le slug", async () => {
    const router = new ProviderRouter([mkProvider({ name: "mock", priority: 99 })]);
    const { fighter, source } = await router.getFighter("inconnu");
    expect(fighter).toBeNull();
    expect(source).toBe("aucune");
  });
});

// ── Combats ────────────────────────────────────────────────────────────

describe("upcomingFights", () => {
  it("les cotes réelles priment, la fiche du mock enrichit", async () => {
    const oddsFight = mkFight({
      id: "odds-1",
      fighters: [{ name: "Canelo Álvarez" }, { name: "Terence Crawford" }],
      odds: [1.9, 1.88],
    });
    const mockFight = mkFight({
      id: "mock-1",
      title: "Superfight incontesté : Canelo vs Crawford",
      venue: "T-Mobile Arena",
      location: "Las Vegas, États-Unis",
      weightClass: "Poids super-moyens",
      fighters: [{ name: "Canelo Álvarez" }, { name: "Terence Crawford" }],
      odds: [2.0, 2.0],
    });

    const router = new ProviderRouter([
      mkProvider({ name: "oddsapi", priority: 1, capabilities: ["odds"], getUpcomingFights: async () => [oddsFight] }),
      mkProvider({ name: "mock", priority: 99, capabilities: ["odds"], getUpcomingFights: async () => [mockFight] }),
    ]);

    const { fights, source } = await router.upcomingFights();
    expect(fights).toHaveLength(1);
    expect(fights[0]!.odds).toEqual([1.9, 1.88]); // cotes réelles
    expect(fights[0]!.title).toBe("Superfight incontesté : Canelo vs Crawford"); // fiche mock
    expect(fights[0]!.venue).toBe("T-Mobile Arena");
    expect(source).toBe("oddsapi + mock");
  });

  it("déduplique par paire de noms, quel que soit l'ordre ou la casse", async () => {
    const a = mkFight({ id: "a", fighters: [{ name: "Canelo Álvarez" }, { name: "Terence Crawford" }] });
    const b = mkFight({ id: "b", fighters: [{ name: "terence crawford" }, { name: "CANELO ALVAREZ" }] });

    const router = new ProviderRouter([
      mkProvider({ name: "p1", capabilities: ["odds"], getUpcomingFights: async () => [a] }),
      mkProvider({ name: "p2", capabilities: ["odds"], getUpcomingFights: async () => [b] }),
    ]);

    const { fights } = await router.upcomingFights();
    expect(fights).toHaveLength(1);
  });

  it("filtre les combats dont la date est déjà passée (AUDIT P2)", async () => {
    const past = mkFight({ id: "past", date: "2020-01-01" });
    const future = mkFight({ id: "future", date: "2030-01-01" });

    const router = new ProviderRouter([
      mkProvider({ name: "mock", capabilities: ["odds"], getUpcomingFights: async () => [past, future] }),
    ]);

    const { fights } = await router.upcomingFights();
    expect(fights.map((f) => f.id)).toEqual(["future"]);
  });

  it("trie par date croissante puis applique la limite", async () => {
    const late = mkFight({ id: "late", date: "2026-12-13" });
    const early = mkFight({ id: "early", date: "2026-09-13" });

    const router = new ProviderRouter([
      mkProvider({ name: "mock", capabilities: ["odds"], getUpcomingFights: async () => [late, early] }),
    ]);

    const { fights } = await router.upcomingFights(1);
    expect(fights).toHaveLength(1);
    expect(fights[0]!.id).toBe("early");
  });
});

describe("recentFights", () => {
  it("fusionne et déduplique les résultats", async () => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const f = mkFight({ id: "r1", status: "finished", date: currentMonth, fighters: [{ name: "Usyk" }, { name: "Fury" }] });
    const dup = mkFight({ id: "r2", status: "finished", date: currentMonth, fighters: [{ name: "Fury" }, { name: "Usyk" }] });

    const router = new ProviderRouter([
      mkProvider({ name: "mock", capabilities: ["fights"], getRecentFights: async () => [f, dup] }),
    ]);

    const { fights } = await router.recentFights();
    expect(fights).toHaveLength(1);
  });
});

describe("status", () => {
  it("remonte l'usage des quotas par provider", async () => {
    mocks.quota.usage.mockResolvedValue({ used: 3, limit: 1000 });

    const router = new ProviderRouter([
      mkProvider({ name: "bigballs", priority: 1, dailyLimit: 1000 }),
      mkProvider({ name: "mock", priority: 99, dailyLimit: 0 }),
    ]);

    const statuses = await router.status();
    // le routeur affiche le dailyLimit du provider (le mock est illimité → 0)
    expect(statuses).toEqual([
      { name: "bigballs", priority: 1, usage: "3/1000" },
      { name: "mock", priority: 99, usage: "3/0" },
    ]);
  });
});

// ── fetchJson ──────────────────────────────────────────────────────────

describe("fetchJson", () => {
  it("lève RateLimitedError sur un 429", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ status: 429, ok: false }) as unknown as Response)
    );
    await expect(fetchJson("https://api.example.com/v1/x")).rejects.toThrow(RateLimitedError);
  });

  it("lève une erreur générique sur un 500", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ status: 500, ok: false }) as unknown as Response)
    );
    await expect(fetchJson("https://api.example.com/v1/x")).rejects.toThrow(/HTTP 500/);
  });

  it("retourne le JSON sur succès", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ status: 200, ok: true, json: async () => ({ data: [1] }) }) as unknown as Response)
    );
    await expect(fetchJson("https://api.example.com/v1/x")).resolves.toEqual({ data: [1] });
  });
});
