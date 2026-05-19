"use client";

// Recharts projection chart — client-only because Recharts requires a DOM.
// All math is computed server-side; this component is pure rendering.

import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Area,
} from "recharts";
import type { ProjectionRow } from "@/lib/dashboard";

type Props = {
  rows: ProjectionRow[];
  targetYear: number;
  netZeroYear: number | null;
  /** true if projected emissions reach 0 by or before target_year */
  onTrackProjection: boolean;
};

const REQUIRED_COLOR = "#9ca3af"; // Tailwind gray-400
const GREEN = "#10b981";          // Tailwind emerald-500
const RED = "#ef4444";            // Tailwind red-500

function formatTons(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}

type TooltipEntry = {
  name?: string;
  value?: number;
  color?: string;
};

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded border bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((entry) => {
        if (entry.name === "current" || entry.value == null) return null;
        return (
          <p key={entry.name} style={{ color: entry.color }}>
            {entry.name === "required" ? "Required path" : "Projected"}:{" "}
            {entry.value.toLocaleString()} t CO₂/yr
          </p>
        );
      })}
    </div>
  );
}

export default function ProjectionChart({
  rows,
  targetYear,
  netZeroYear,
  onTrackProjection,
}: Props) {
  const projectedColor = onTrackProjection ? GREEN : RED;
  const lastYear = rows[rows.length - 1]?.year ?? targetYear;

  const netZeroLabel =
    netZeroYear != null
      ? `Net zero by ${netZeroYear}`
      : `Net zero not reached by ${lastYear}`;

  // Scatter needs data with x/y keys; extract current-year dot only.
  const currentDot = rows
    .filter((r) => r.current != null)
    .map((r) => ({ year: r.year, value: r.current as number }));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-base font-semibold">
          Projected emissions trajectory
        </h2>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
            onTrackProjection
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {netZeroLabel}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={rows} margin={{ top: 10, right: 24, left: 16, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="year"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickCount={8}
            label={{ value: "Year", position: "insideBottom", offset: -12, fontSize: 12 }}
          />
          <YAxis
            tickFormatter={formatTons}
            label={{
              value: "t CO₂/yr",
              angle: -90,
              position: "insideLeft",
              offset: 10,
              fontSize: 12,
            }}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="top" height={32} />

          {/* Net-zero floor */}
          <ReferenceLine y={0} stroke="#d1d5db" strokeWidth={1} />

          {/* Target year vertical line */}
          <ReferenceLine
            x={targetYear}
            stroke="#6b7280"
            strokeDasharray="4 3"
            label={{ value: "Target", position: "top", fontSize: 11, fill: "#6b7280" }}
          />

          {/* Subtle gradient fill under projected line */}
          <defs>
            <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={projectedColor} stopOpacity={0.15} />
              <stop offset="95%" stopColor={projectedColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            dataKey="projected"
            name="projected"
            stroke={projectedColor}
            fill="url(#projectedGradient)"
            strokeWidth={2}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />

          {/* Required path — dashed, neutral gray */}
          <Line
            dataKey="required"
            name="required"
            stroke={REQUIRED_COLOR}
            strokeDasharray="6 3"
            strokeWidth={2}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />

          {/* Current-year dot on the projected line */}
          <Scatter
            data={currentDot}
            dataKey="value"
            name="current"
            fill={projectedColor}
            line={false}
            legendType="none"
          />
        </ComposedChart>
      </ResponsiveContainer>

      <p className="text-center text-xs text-muted-foreground">
        "Projected" assumes every action delivers its stated annual reduction starting at its{" "}
        <em>start year</em>, regardless of status. "Required" is the linear path to net zero by{" "}
        {targetYear}.
      </p>
    </div>
  );
}
