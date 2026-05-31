import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SCAN_COUNT_KEY } from "@/lib/planLimits";
import {
  loadWardrobe,
  saveWardrobe,
  getScanCount,
  setScanCount,
} from "./wardrobeStorage";

// ── In-memory localStorage stub ──────────────────────────────────────────────

let store: Record<string, string>;
let throwOnNextSet = false;
let throwOnNextGet = false;

const stubStorage: Storage = {
  get length() {
    return Object.keys(store).length;
  },
  key: (i: number) => Object.keys(store)[i] ?? null,
  getItem: (k: string) => {
    if (throwOnNextGet) {
      throwOnNextGet = false;
      throw new Error("SecurityError: access denied (e.g. Safari private mode)");
    }
    return Object.prototype.hasOwnProperty.call(store, k) ? store[k]! : null;
  },
  setItem: (k: string, v: string) => {
    if (throwOnNextSet) {
      throwOnNextSet = false;
      throw new Error("QuotaExceededError");
    }
    store[k] = v;
  },
  removeItem: (k: string) => {
    delete store[k];
  },
  clear: () => {
    store = {};
  },
};

beforeEach(() => {
  store = {};
  throwOnNextSet = false;
  throwOnNextGet = false;
  vi.stubGlobal("localStorage", stubStorage);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─────────────────────────────────────────────────────────────────────────────
// Wardrobe
// ─────────────────────────────────────────────────────────────────────────────

describe("loadWardrobe", () => {
  it("returns [] when the key is missing", () => {
    expect(loadWardrobe()).toEqual([]);
  });

  it("returns the parsed array when present", () => {
    store["aplomb_wardrobe"] = JSON.stringify([
      { id: "o1", brandName: "Acme", brandSlug: "acme", savedAt: "2025-01-01", items: [] },
    ]);
    expect(loadWardrobe()).toHaveLength(1);
    expect(loadWardrobe()[0]?.id).toBe("o1");
  });

  it("returns [] when the stored value is corrupt JSON (anti-crash guard)", () => {
    store["aplomb_wardrobe"] = "not-json{{{";
    expect(loadWardrobe()).toEqual([]);
  });

  it("returns [] when the stored value parses to a non-array (defensive)", () => {
    store["aplomb_wardrobe"] = JSON.stringify({ not: "an array" });
    expect(loadWardrobe()).toEqual([]);
  });

  it("returns [] when localStorage throws on read (Safari private mode)", () => {
    throwOnNextGet = true;
    expect(loadWardrobe()).toEqual([]);
  });
});

describe("saveWardrobe", () => {
  it("serialises the array into the wardrobe key", () => {
    saveWardrobe([
      { id: "o1", brandName: "Acme", brandSlug: "acme", savedAt: "2025-01-01", items: [] },
    ]);
    expect(JSON.parse(store["aplomb_wardrobe"]!)).toHaveLength(1);
  });

  it("never throws when localStorage write fails (quota / iframe sandbox)", () => {
    throwOnNextSet = true;
    expect(() => saveWardrobe([])).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scan counter
// ─────────────────────────────────────────────────────────────────────────────

describe("getScanCount", () => {
  it("returns 0 when no key set", () => {
    expect(getScanCount()).toBe(0);
  });

  it("returns the parsed integer", () => {
    store[SCAN_COUNT_KEY] = "7";
    expect(getScanCount()).toBe(7);
  });

  it("falls back to 0 on non-numeric garbage (anti-NaN render)", () => {
    store[SCAN_COUNT_KEY] = "not-a-number";
    expect(getScanCount()).toBe(0);
  });

  it("falls back to 0 on negative values (defensive against bad writes)", () => {
    store[SCAN_COUNT_KEY] = "-5";
    expect(getScanCount()).toBe(0);
  });

  it("returns 0 when localStorage throws", () => {
    throwOnNextGet = true;
    expect(getScanCount()).toBe(0);
  });
});

describe("setScanCount", () => {
  it("writes the count as a string under SCAN_COUNT_KEY", () => {
    setScanCount(3);
    expect(store[SCAN_COUNT_KEY]).toBe("3");
  });

  it("never throws when localStorage write fails", () => {
    throwOnNextSet = true;
    expect(() => setScanCount(1)).not.toThrow();
  });

  it("round-trips through get → set → get", () => {
    setScanCount(12);
    expect(getScanCount()).toBe(12);
  });
});
