import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock the Supabase service client BEFORE importing storage.ts ───────────
//
// storage.ts grabs the service client lazily via getSupabaseServiceClient(),
// so we can stub that to capture the call shape and return synthetic
// responses without ever needing real env vars.

const createSignedUrls = vi.fn();
const createSignedUrl = vi.fn();

vi.mock("@/lib/supabase", () => ({
  getSupabaseServiceClient: () => ({
    storage: {
      from: () => ({
        createSignedUrl,
        createSignedUrls,
      }),
    },
  }),
}));

import { getSignedWardrobeUrls, _SIGN_BATCH_SIZE_FOR_TESTS } from "./storage";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getSignedWardrobeUrls — batch signing", () => {
  it("returns an empty map for empty input and DOES NOT hit Supabase", async () => {
    const out = await getSignedWardrobeUrls([]);
    expect(out.size).toBe(0);
    expect(createSignedUrls).not.toHaveBeenCalled();
  });

  it("de-duplicates paths before signing", async () => {
    createSignedUrls.mockResolvedValue({
      data: [
        { path: "users/a/1/front.jpg", signedUrl: "https://x/1" },
        { path: "users/a/2/front.jpg", signedUrl: "https://x/2" },
      ],
      error: null,
    });

    const out = await getSignedWardrobeUrls([
      "users/a/1/front.jpg",
      "users/a/1/front.jpg", // dupe — should be collapsed
      "users/a/2/front.jpg",
    ]);

    expect(createSignedUrls).toHaveBeenCalledTimes(1);
    const passedPaths = createSignedUrls.mock.calls[0]![0];
    expect(passedPaths).toHaveLength(2);
    expect(new Set(passedPaths)).toEqual(
      new Set(["users/a/1/front.jpg", "users/a/2/front.jpg"]),
    );

    expect(out.get("users/a/1/front.jpg")).toBe("https://x/1");
    expect(out.get("users/a/2/front.jpg")).toBe("https://x/2");
  });

  it("returns an empty map (no throw) when Supabase errors out", async () => {
    createSignedUrls.mockResolvedValue({
      data: null,
      error: { message: "boom" },
    });
    const out = await getSignedWardrobeUrls(["users/a/1/front.jpg"]);
    expect(out.size).toBe(0);
  });

  it("skips rows missing signedUrl or path in the response", async () => {
    createSignedUrls.mockResolvedValue({
      data: [
        { path: "users/a/1/front.jpg", signedUrl: "https://x/1" },
        { path: "users/a/2/front.jpg", signedUrl: null },
        { path: null, signedUrl: "https://x/3" },
      ],
      error: null,
    });
    const out = await getSignedWardrobeUrls([
      "users/a/1/front.jpg",
      "users/a/2/front.jpg",
    ]);
    expect(out.size).toBe(1);
    expect(out.get("users/a/1/front.jpg")).toBe("https://x/1");
  });
});

// ─── Chunking behaviour (Supabase batch-size cap) ──────────────────────────
//
// Supabase caps `createSignedUrls` at SIGN_BATCH_SIZE paths per call. The
// helper slices its input and signs every chunk in parallel; these tests
// pin that behaviour so a future "Unlimited Model wardrobe" doesn't
// silently drop URLs past the boundary.

describe("getSignedWardrobeUrls — chunking", () => {
  /** Builds N unique synthetic paths. */
  function paths(n: number, prefix = "u/A/"): string[] {
    return Array.from({ length: n }, (_, i) => `${prefix}${i}.jpg`);
  }
  /** Builds a successful Supabase response that echoes each path back. */
  function ok(input: string[]): { data: { path: string; signedUrl: string }[]; error: null } {
    return {
      data: input.map((p, i) => ({ path: p, signedUrl: `https://x/${p}/${i}` })),
      error: null,
    };
  }

  it("makes ONE Supabase call when the path set is at the batch-size boundary", async () => {
    const input = paths(_SIGN_BATCH_SIZE_FOR_TESTS); // exactly = cap
    createSignedUrls.mockImplementation((chunk: string[]) =>
      Promise.resolve(ok(chunk)),
    );

    const out = await getSignedWardrobeUrls(input);

    expect(createSignedUrls).toHaveBeenCalledTimes(1);
    expect(createSignedUrls.mock.calls[0]![0]).toHaveLength(
      _SIGN_BATCH_SIZE_FOR_TESTS,
    );
    expect(out.size).toBe(_SIGN_BATCH_SIZE_FOR_TESTS);
  });

  it("chunks correctly just past the boundary (BATCH + 1 → 2 calls, sizes BATCH and 1)", async () => {
    const input = paths(_SIGN_BATCH_SIZE_FOR_TESTS + 1);
    createSignedUrls.mockImplementation((chunk: string[]) =>
      Promise.resolve(ok(chunk)),
    );

    const out = await getSignedWardrobeUrls(input);

    expect(createSignedUrls).toHaveBeenCalledTimes(2);
    const sizes = createSignedUrls.mock.calls
      .map((c) => (c[0] as string[]).length)
      .sort((a, b) => a - b);
    expect(sizes).toEqual([1, _SIGN_BATCH_SIZE_FOR_TESTS]);
    expect(out.size).toBe(_SIGN_BATCH_SIZE_FOR_TESTS + 1);
  });

  it("signs three full chunks for a 3×BATCH workload (Unlimited-plan scale)", async () => {
    const N = _SIGN_BATCH_SIZE_FOR_TESTS * 3;
    const input = paths(N);
    createSignedUrls.mockImplementation((chunk: string[]) =>
      Promise.resolve(ok(chunk)),
    );

    const out = await getSignedWardrobeUrls(input);

    expect(createSignedUrls).toHaveBeenCalledTimes(3);
    for (const call of createSignedUrls.mock.calls) {
      expect((call[0] as string[]).length).toBe(_SIGN_BATCH_SIZE_FOR_TESTS);
    }
    expect(out.size).toBe(N);
  });

  it("partial failure isolation: one chunk errors, the others still populate the map", async () => {
    const input = paths(_SIGN_BATCH_SIZE_FOR_TESTS * 2); // 2 chunks
    let callIdx = 0;
    createSignedUrls.mockImplementation((chunk: string[]) => {
      callIdx++;
      if (callIdx === 1) {
        // First chunk fails with a Supabase-reported error.
        return Promise.resolve({ data: null, error: { message: "rate limit" } });
      }
      return Promise.resolve(ok(chunk));
    });

    const out = await getSignedWardrobeUrls(input);

    expect(createSignedUrls).toHaveBeenCalledTimes(2);
    // Exactly the second-chunk paths should have URLs.
    expect(out.size).toBe(_SIGN_BATCH_SIZE_FOR_TESTS);
    // First-chunk paths should NOT be in the map.
    expect(out.get(input[0]!)).toBeUndefined();
    // Last path was in the second chunk → should be present.
    expect(out.get(input[input.length - 1]!)).toBeDefined();
  });

  it("partial failure isolation: one chunk THROWS, the other still populates the map", async () => {
    const input = paths(_SIGN_BATCH_SIZE_FOR_TESTS * 2);
    let callIdx = 0;
    createSignedUrls.mockImplementation((chunk: string[]) => {
      callIdx++;
      if (callIdx === 1) return Promise.reject(new Error("network down"));
      return Promise.resolve(ok(chunk));
    });

    const out = await getSignedWardrobeUrls(input);

    expect(out.size).toBe(_SIGN_BATCH_SIZE_FOR_TESTS);
  });
});
