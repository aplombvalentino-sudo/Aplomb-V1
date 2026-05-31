import { describe, it, expect } from "vitest";
import { recommendSizes, type SizeChartLike } from "./recommendSizes";
import type { NormalizedMeasurements } from "@/lib/ai/measurementProvider";

// ── Helpers ──────────────────────────────────────────────────────────────────

function measurements(
  overrides: Partial<NormalizedMeasurements> = {},
): NormalizedMeasurements {
  return {
    measurementMode: "easy",
    sourceConfidence: { chest: "ai", waist: "ai", hips: "ai", shoulders: "ai", inseam: "ai" },
    heightCm: 175,
    weightKg: 70,
    chestCm: 92,
    waistCm: 76,
    hipsCm: 98,
    shouldersCm: 44,
    inseamCm: 80,
    providerName: "stub",
    ...overrides,
  };
}

function topChart(): SizeChartLike {
  return {
    category: "tops",
    chartJson: {
      sizes: [
        { label: "S", chest: [82, 88], shoulders: [40, 42] },
        { label: "M", chest: [88, 94], shoulders: [42, 45] },
        { label: "L", chest: [94, 100], shoulders: [45, 48] },
      ],
    },
  };
}

function bottomChart(): SizeChartLike {
  return {
    category: "pants",
    chartJson: {
      sizes: [
        { label: "28", waist: [70, 74], hips: [92, 96], inseam: [78, 82] },
        { label: "30", waist: [74, 78], hips: [96, 100], inseam: [78, 82] },
        { label: "32", waist: [78, 82], hips: [100, 104], inseam: [80, 84] },
      ],
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Happy paths — picks the right size when values clearly fall in one row
// ─────────────────────────────────────────────────────────────────────────────

describe("recommendSizes — happy paths", () => {
  it("picks M for a 92cm chest against a top chart with M = [88, 94]", () => {
    const r = recommendSizes(measurements({ chestCm: 92 }), [topChart()]);
    expect(r).toHaveLength(1);
    expect(r[0]?.category).toBe("tops");
    expect(r[0]?.recommendedSize).toBe("M");
  });

  it("picks 30 for waist 76 / hips 98 against the bottom chart (30 = [74,78] / [96,100])", () => {
    const r = recommendSizes(
      measurements({ waistCm: 76, hipsCm: 98 }),
      [bottomChart()],
    );
    expect(r[0]?.recommendedSize).toBe("30");
  });

  it("returns one recommendation per chart, in input order", () => {
    const r = recommendSizes(measurements(), [topChart(), bottomChart()]);
    expect(r).toHaveLength(2);
    expect(r[0]?.category).toBe("tops");
    expect(r[1]?.category).toBe("pants");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Category routing — top vs bottom uses different driving measurements
// ─────────────────────────────────────────────────────────────────────────────

describe("recommendSizes — driving-measurement routing per category", () => {
  it("bottom categories DO NOT use chest (so a wrong chest doesn't pollute pants size)", () => {
    // Give a chest measurement that would map to L in the top chart, but the
    // waist/hips clearly point to size 30 on the bottom chart. The bottom
    // recommendation must come from waist/hips/inseam only.
    const r = recommendSizes(
      measurements({ chestCm: 99, waistCm: 76, hipsCm: 98 }),
      [bottomChart()],
    );
    expect(r[0]?.recommendedSize).toBe("30");
  });

  it("top categories DO NOT use waist/hips (so wide hips don't bump up shirt size)", () => {
    const r = recommendSizes(
      measurements({ chestCm: 92, waistCm: 100, hipsCm: 110 }),
      [topChart()],
    );
    expect(r[0]?.recommendedSize).toBe("M");
  });

  it("recognises various synonyms for top/bottom (dress → top driving, skirt → bottom driving)", () => {
    const dressChart: SizeChartLike = {
      category: "dress",
      chartJson: {
        sizes: [
          { label: "S", chest: [82, 88] },
          { label: "M", chest: [88, 94] },
          { label: "L", chest: [94, 100] },
        ],
      },
    };
    expect(
      recommendSizes(measurements({ chestCm: 92 }), [dressChart])[0]?.recommendedSize,
    ).toBe("M");

    const skirtChart: SizeChartLike = {
      category: "skirt",
      chartJson: {
        sizes: [
          { label: "S", waist: [70, 74] },
          { label: "M", waist: [74, 78] },
          { label: "L", waist: [78, 82] },
        ],
      },
    };
    expect(
      recommendSizes(measurements({ waistCm: 76 }), [skirtChart])[0]?.recommendedSize,
    ).toBe("M");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Confidence policy
// ─────────────────────────────────────────────────────────────────────────────

describe("recommendSizes — confidence labels", () => {
  it("low: easy mode, ai source, only partial in-range", () => {
    // Chest 80 is OUT of all 3 ranges (smallest S starts at 82). All AI source.
    const r = recommendSizes(measurements({ chestCm: 80 }), [topChart()]);
    expect(r[0]?.confidence).toBe("low");
  });

  it("medium: all driving measurements in-range BUT easy/AI source", () => {
    const r = recommendSizes(
      measurements({ measurementMode: "easy", chestCm: 91, shouldersCm: 43 }),
      [topChart()],
    );
    expect(r[0]?.confidence).toBe("medium");
  });

  it("medium: advanced mode + 1 manual source + partial-in-range", () => {
    const r = recommendSizes(
      measurements({
        measurementMode: "advanced",
        chestCm: 80, // out of every range
        sourceConfidence: {
          chest: "manual",
          waist: "ai",
          hips: "ai",
          shoulders: "ai",
          inseam: "ai",
        },
      }),
      [topChart()],
    );
    expect(r[0]?.confidence).toBe("medium");
  });

  it("high: advanced mode + 2+ manual sources + all driving in-range", () => {
    const r = recommendSizes(
      measurements({
        measurementMode: "advanced",
        chestCm: 91,
        shouldersCm: 43,
        sourceConfidence: {
          chest: "manual",
          waist: "ai",
          hips: "ai",
          shoulders: "manual",
          inseam: "ai",
        },
      }),
      [topChart()],
    );
    expect(r[0]?.confidence).toBe("high");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Defensive — bad input doesn't crash
// ─────────────────────────────────────────────────────────────────────────────

describe("recommendSizes — defensive parsing", () => {
  it("returns [] when chartJson is null", () => {
    expect(recommendSizes(measurements(), [{ category: "tops", chartJson: null }])).toEqual([]);
  });

  it("returns [] when chartJson is not an object", () => {
    expect(recommendSizes(measurements(), [{ category: "tops", chartJson: "garbage" }])).toEqual([]);
  });

  it("returns [] when chartJson.sizes is missing", () => {
    expect(
      recommendSizes(measurements(), [{ category: "tops", chartJson: { sizes: undefined } }]),
    ).toEqual([]);
  });

  it("returns [] when chartJson.sizes is not an array", () => {
    expect(
      recommendSizes(measurements(), [{ category: "tops", chartJson: { sizes: "M" } }]),
    ).toEqual([]);
  });

  it("filters out rows without a label key", () => {
    const chart: SizeChartLike = {
      category: "tops",
      chartJson: {
        sizes: [
          { chest: [88, 94] }, // no label
          { label: "M", chest: [88, 94] },
        ],
      },
    };
    const r = recommendSizes(measurements(), [chart]);
    expect(r[0]?.recommendedSize).toBe("M");
  });

  it("skips a chart entirely when no driving measurement has any matching range", () => {
    // Top chart has no waist/hips/inseam ranges; if we feed it as a bottom
    // category with only waist measurement, evaluated stays 0 → null → filtered.
    const oddChart: SizeChartLike = {
      category: "shorts",
      chartJson: {
        sizes: [{ label: "X", chest: [80, 100] }], // chest range but bottom-driven category
      },
    };
    expect(recommendSizes(measurements({ waistCm: 76 }), [oddChart])).toEqual([]);
  });

  it("handles a customer missing a driving measurement (e.g. easy mode, no chest)", () => {
    const m = measurements({ chestCm: undefined, shouldersCm: undefined });
    // No chest, no shoulders → top chart has nothing to score against → filtered.
    expect(recommendSizes(m, [topChart()])).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Explanation — honest, never absolute
// ─────────────────────────────────────────────────────────────────────────────

describe("recommendSizes — explanations", () => {
  it("explanation includes the values that drove the decision", () => {
    const r = recommendSizes(measurements({ chestCm: 91, shouldersCm: 43 }), [topChart()]);
    expect(r[0]?.explanation).toMatch(/chest 91cm/);
    expect(r[0]?.explanation).toMatch(/shoulders 43cm/);
  });

  it("explanation softens its tone when some measurements miss the range", () => {
    const r = recommendSizes(measurements({ chestCm: 87, shouldersCm: 50 }), [topChart()]);
    // chest 87 lands in S = [82,88], shoulders 50 is above the largest range — partial.
    expect(r[0]?.explanation).toMatch(/most important measurement|near the edge|may vary/);
  });

  it("never returns an absolute phrasing (no 'exactly', 'perfect', 'guaranteed')", () => {
    const r = recommendSizes(measurements(), [topChart(), bottomChart()]);
    for (const rec of r) {
      expect(rec.explanation).not.toMatch(/exactly|perfect|guaranteed/i);
    }
  });
});
