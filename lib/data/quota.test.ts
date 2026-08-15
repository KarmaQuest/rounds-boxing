import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QuotaTracker } from "./quota";
import type { QuotaDriver } from "./quota";

/**
 * Tests du suivi de quota + circuit breaker :
 * - la logique du QuotaTracker (avec un driver mocké) ;
 * - la persistance disque du MemoryDriver (flush débouncé + rollover de jour),
 *   isolée dans un dossier temporaire via QUOTA_FILE.
 */

// ── QuotaTracker (logique) ─────────────────────────────────────────────

function fakeDriver() {
  return {
    isCircuitOpen: vi.fn(async () => false),
    openCircuit: vi.fn(async () => undefined),
    usedToday: vi.fn(async () => 0),
    consume: vi.fn(async () => 1),
    recordFailure: vi.fn(async () => 1),
    resetFailures: vi.fn(async () => undefined),
  };
}

describe("QuotaTracker", () => {
  let d: ReturnType<typeof fakeDriver>;
  let tracker: QuotaTracker;

  beforeEach(() => {
    d = fakeDriver();
    tracker = new QuotaTracker(d as unknown as QuotaDriver);
  });

  it("isAvailable : true sous la limite, circuit fermé", async () => {
    d.usedToday.mockResolvedValue(3);
    await expect(tracker.isAvailable("bigballs", 1000)).resolves.toBe(true);
  });

  it("isAvailable : false quand le quota du jour est épuisé", async () => {
    d.usedToday.mockResolvedValue(1000);
    await expect(tracker.isAvailable("bigballs", 1000)).resolves.toBe(false);
  });

  it("isAvailable : false quand le circuit est ouvert", async () => {
    d.isCircuitOpen.mockResolvedValue(true);
    await expect(tracker.isAvailable("bigballs", 1000)).resolves.toBe(false);
    expect(d.usedToday).not.toHaveBeenCalled();
  });

  it("consume : consomme une requête quand c'est possible", async () => {
    d.usedToday.mockResolvedValue(4);
    await expect(tracker.consume("bigballs", 10)).resolves.toBe(true);
    expect(d.consume).toHaveBeenCalledWith("bigballs");
  });

  it("consume : refuse quand le quota est déjà épuisé (aucune écriture)", async () => {
    d.usedToday.mockResolvedValue(10);
    await expect(tracker.consume("bigballs", 10)).resolves.toBe(false);
    expect(d.consume).not.toHaveBeenCalled();
  });

  it("recordFailure : ouvre le circuit au 3e échec consécutif", async () => {
    d.recordFailure
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3);

    await tracker.recordFailure("bigballs", false);
    await tracker.recordFailure("bigballs", false);
    await tracker.recordFailure("bigballs", false);

    expect(d.openCircuit).toHaveBeenCalledTimes(1);
    expect(d.openCircuit).toHaveBeenCalledWith("bigballs", 10);
  });

  it("recordFailure : un rate limit (429) ouvre le circuit immédiatement", async () => {
    d.recordFailure.mockResolvedValue(1);
    await tracker.recordFailure("oddsapi", true);
    expect(d.openCircuit).toHaveBeenCalledWith("oddsapi", 10);
  });

  it("recordSuccess : réinitialise les échecs", async () => {
    await tracker.recordSuccess("bigballs");
    expect(d.resetFailures).toHaveBeenCalledWith("bigballs");
  });

  it("usage : remonte used/limit", async () => {
    d.usedToday.mockResolvedValue(7);
    await expect(tracker.usage("thesportsdb", 500)).resolves.toEqual({ used: 7, limit: 500 });
  });
});

// ── MemoryDriver (persistance disque) ──────────────────────────────────

describe("MemoryDriver", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "rounds-quota-"));
  });

  afterEach(() => {
    delete process.env.QUOTA_FILE;
    rmSync(dir, { recursive: true, force: true });
  });

  /** Re-importe le module avec QUOTA_FILE pointant vers un dossier temporaire. */
  async function freshQuotaModule() {
    vi.resetModules();
    process.env.QUOTA_FILE = join(dir, "quota.json");
    return import("./quota");
  }

  it("persiste les compteurs après le flush débouncé (5 s)", async () => {
    vi.useFakeTimers();
    try {
      const first = await freshQuotaModule();
      const driver = new first.MemoryDriver();
      await driver.consume("bigballs");
      await driver.consume("bigballs");
      expect(await driver.usedToday("bigballs")).toBe(2);

      // Avant le flush : rien n'est écrit sur disque.
      const second = await freshQuotaModule();
      const reloaded = new second.MemoryDriver();
      expect(await reloaded.usedToday("bigballs")).toBe(0);

      // Après le flush débouncé : la nouvelle instance retrouve les compteurs.
      await vi.advanceTimersByTimeAsync(6000);
      const third = await freshQuotaModule();
      const reloaded2 = new third.MemoryDriver();
      expect(await reloaded2.usedToday("bigballs")).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("remet les compteurs à zéro au changement de jour", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-08-15T12:00:00Z"));
      const mod = await freshQuotaModule();
      const driver = new mod.MemoryDriver();
      await driver.consume("oddsapi");
      expect(await driver.usedToday("oddsapi")).toBe(1);

      vi.setSystemTime(new Date("2026-08-16T00:30:00Z"));
      expect(await driver.usedToday("oddsapi")).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("consume incrémente et openCircuit expire après le délai", async () => {
    const mod = await freshQuotaModule();
    const driver = new mod.MemoryDriver();

    await driver.openCircuit("bigballs", 1);
    expect(await driver.isCircuitOpen("bigballs")).toBe(true);

    vi.useFakeTimers();
    try {
      vi.advanceTimersByTime(61_000);
      expect(await driver.isCircuitOpen("bigballs")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
