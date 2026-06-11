"use client";

/**
 * Public entrypoint for the dashboard overview chart.
 *
 * Lazily loads the recharts implementation in OverviewChartsImpl.tsx
 * so the ~100 KB recharts bundle is split out of the dashboard's
 * initial JS payload. Three pages mount this component
 * (/dashboard, /pro/dashboard, /pro/analytics); without the split,
 * every one of those pages pulled the chart bundle even before any
 * interaction.
 *
 * ssr: false → recharts is not in the server-rendered HTML either,
 * which keeps the initial response small and means the chart doesn't
 * block first paint. A skeleton with the same dimensions (h-[240px])
 * holds the layout so there's no CLS when the lazy chunk hydrates.
 *
 * Public API stays IDENTICAL to the pre-split component: same
 * `OverviewCharts` named export, same `{ sessions }` props. Pages
 * that already imported this file don't need any change.
 */

import dynamic from "next/dynamic";

type Session = { date: string };

const LazyOverviewCharts = dynamic(
  () => import("./OverviewChartsImpl").then((m) => m.OverviewChartsImpl),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[240px] w-full animate-pulse rounded-md bg-ink/5"
        aria-hidden
      />
    ),
  },
);

export function OverviewCharts({ sessions }: { sessions: Session[] }) {
  return <LazyOverviewCharts sessions={sessions} />;
}
