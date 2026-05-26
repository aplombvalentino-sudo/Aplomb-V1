/**
 * Deterministic size recommendation engine.
 *
 * Given a customer's NormalizedMeasurements and the brand's SizeChart rows,
 * picks the most plausible size per category along with a confidence label
 * and a human-readable explanation.
 *
 * Honest by design — we always surface confidence rather than pretending
 * the answer is absolute.
 */

import type { NormalizedMeasurements } from "@/lib/ai/measurementProvider";

// ─── Types ──────────────────────────────────────────────────────────────────

export type RecommendedSize = {
  category: string;
  recommendedSize: string;
  confidence: "low" | "medium" | "high";
  explanation: string;
};

/**
 * Each SizeChart.chartJson is expected to follow the shape:
 *   {
 *     "sizes": [
 *       { "label": "S", "chest": [86, 90], "waist": [70, 74], "hips": [92, 96] },
 *       { "label": "M", "chest": [90, 94], "waist": [74, 78], "hips": [96, 100] },
 *       ...
 *     ]
 *   }
 * Range arrays are [minCm, maxCm]. Missing keys are tolerated.
 */
export type SizeChartRow = {
  label: string;
  chest?: [number, number];
  waist?: [number, number];
  hips?: [number, number];
  shoulders?: [number, number];
  inseam?: [number, number];
};

export type SizeChartLike = {
  category: string;
  chartJson: unknown;
};

// ─── Public API ─────────────────────────────────────────────────────────────

export function recommendSizes(
  measurements: NormalizedMeasurements,
  sizeCharts: SizeChartLike[],
): RecommendedSize[] {
  return sizeCharts
    .map((chart) => recommendForCategory(measurements, chart))
    .filter((r): r is RecommendedSize => r !== null);
}

function recommendForCategory(
  m: NormalizedMeasurements,
  chart: SizeChartLike,
): RecommendedSize | null {
  const rows = parseRows(chart.chartJson);
  if (rows.length === 0) return null;

  const category = chart.category.toLowerCase();
  const isBottom = /bottom|pant|trouser|jean|skirt|short/.test(category);
  const isTop = /top|shirt|tee|blouse|sweater|jacket|coat|outer|dress/.test(category);

  // Decide which body measurements drive this category
  const driveKeys: Array<keyof NormalizedMeasurements> = isBottom
    ? ["waistCm", "hipsCm", "inseamCm"]
    : isTop
    ? ["chestCm", "shouldersCm"]
    : ["chestCm", "waistCm", "hipsCm"];

  // Score every row — closer to mid-range = better, in-range = best
  const scored = rows.map((row) => {
    let score = 0;
    let evaluated = 0;
    let inRangeCount = 0;
    for (const key of driveKeys) {
      const value = m[key];
      if (typeof value !== "number") continue;
      const range = (row as Record<string, unknown>)[mapKey(key)] as
        | [number, number]
        | undefined;
      if (!range) continue;
      evaluated++;
      const [min, max] = range;
      const mid = (min + max) / 2;
      const halfWidth = Math.max(1, (max - min) / 2);
      const distance = Math.abs(value - mid);
      // Negative score is good (lower = closer). In-range gives a flat bonus.
      score -= distance;
      if (value >= min && value <= max) {
        score += halfWidth * 1.5;
        inRangeCount++;
      }
    }
    return { row, score, evaluated, inRangeCount };
  });

  const best = scored.sort((a, b) => b.score - a.score)[0];
  if (!best || best.evaluated === 0) return null;

  // Confidence policy:
  //  - high: all driving measurements in-range and at least 2 manual sources for advanced mode
  //  - medium: most in-range, OR partly manual in advanced mode
  //  - low: easy mode AI heuristic with one or zero ranges hit
  const manualCount = countManualSources(m, driveKeys);
  const allInRange = best.inRangeCount === best.evaluated;
  const advancedBoost = m.measurementMode === "advanced" && manualCount >= 2;

  const confidence: RecommendedSize["confidence"] =
    allInRange && advancedBoost ? "high" :
    allInRange || (m.measurementMode === "advanced" && manualCount >= 1) ? "medium" :
    "low";

  const explanation = buildExplanation(m, driveKeys, best.row, best.inRangeCount, best.evaluated);

  return {
    category: chart.category,
    recommendedSize: best.row.label,
    confidence,
    explanation,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseRows(chartJson: unknown): SizeChartRow[] {
  if (!chartJson || typeof chartJson !== "object") return [];
  const obj = chartJson as { sizes?: unknown };
  if (!Array.isArray(obj.sizes)) return [];
  return obj.sizes
    .filter((r): r is SizeChartRow => !!r && typeof r === "object" && "label" in r)
    .map((r) => r as SizeChartRow);
}

function mapKey(measurementKey: keyof NormalizedMeasurements): string {
  // chestCm → chest, etc.
  return String(measurementKey).replace(/Cm$/, "");
}

function countManualSources(
  m: NormalizedMeasurements,
  keys: Array<keyof NormalizedMeasurements>,
): number {
  let n = 0;
  for (const key of keys) {
    const baseKey = mapKey(key) as keyof NormalizedMeasurements["sourceConfidence"];
    if (m.sourceConfidence[baseKey] === "manual") n++;
  }
  return n;
}

function buildExplanation(
  m: NormalizedMeasurements,
  driveKeys: Array<keyof NormalizedMeasurements>,
  row: SizeChartRow,
  inRange: number,
  total: number,
): string {
  const usedKeys = driveKeys
    .map((k) => ({ k, base: mapKey(k), value: m[k] }))
    .filter((x) => typeof x.value === "number")
    .map((x) => `${x.base} ${Math.round(x.value as number)}cm`)
    .join(", ");

  const fitNote = inRange === total
    ? "matches the size range across all driving measurements"
    : inRange > 0
    ? "matches on the most important measurement; others sit near the edge"
    : "is the closest available size — fit may vary";

  void row;
  return `Based on your ${usedKeys}, this ${fitNote}.`;
}
