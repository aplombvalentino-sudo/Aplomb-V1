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

import { getSignedWardrobeUrls } from "./storage";

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
