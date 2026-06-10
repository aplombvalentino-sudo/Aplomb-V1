"use client";

/**
 * Recharts implementation of the dashboard overview bar chart.
 *
 * Split from OverviewCharts.tsx so the recharts bundle (~100 KB
 * minified) can be dynamically imported by the public wrapper —
 * keeps the dashboard's initial JS payload lean. See OverviewCharts.tsx
 * for the lazy-loaded entrypoint.
 *
 * Pages MUST NOT import this file directly — always import from
 * `./OverviewCharts` so the dynamic boundary stays intact.
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";

type Session = { date: string };

function buildDailyBuckets(sessions: Session[]) {
  const today = startOfDay(new Date());
  const buckets: Record<string, number> = {};

  for (let i = 6; i >= 0; i--) {
    const day = subDays(today, i);
    buckets[format(day, "MMM d")] = 0;
  }

  for (const s of sessions) {
    const label = format(new Date(s.date), "MMM d");
    if (label in buckets) buckets[label]++;
  }

  return Object.entries(buckets).map(([date, count]) => ({ date, count }));
}

export function OverviewChartsImpl({ sessions }: { sessions: Session[] }) {
  const data = buildDailyBuckets(sessions);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 12, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid #e5e7eb",
          }}
        />
        <Bar dataKey="count" fill="#000" radius={[4, 4, 0, 0]} name="Sessions" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default OverviewChartsImpl;
