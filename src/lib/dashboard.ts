// Pure server-side computations for the public dashboard.
// No imports from React or Next.js — these are unit-testable plain functions.

import type { City, ClimateAction } from "@/lib/api";

export type ProjectionRow = {
  year: number;
  required: number;
  projected: number;
  current: number | null; // non-null only on the current-year row
};

export function computeProjection(
  city: City,
  actions: ClimateAction[],
  currentYear: number
): { rows: ProjectionRow[]; netZeroYear: number | null } {
  const { baseline_tons, baseline_year, target_year } = city;
  const lastYear = Math.max(target_year, currentYear + 2);
  const span = target_year - baseline_year; // denominator for the required ramp

  const rows: ProjectionRow[] = [];

  for (let year = baseline_year; year <= lastYear; year++) {
    // Required: linear from baseline_tons at baseline_year → 0 at target_year, then 0.
    const required =
      year >= target_year
        ? 0
        : Math.max(0, baseline_tons - (baseline_tons / span) * (year - baseline_year));

    // Projected: baseline minus cumulative reductions from all actions whose start_year ≤ year.
    const cumulative = actions
      .filter((a) => a.start_year <= year)
      .reduce((sum, a) => sum + a.annual_reduction, 0);
    const projected = Math.max(0, baseline_tons - cumulative);

    rows.push({
      year,
      required: Math.round(required),
      projected: Math.round(projected),
      current: year === currentYear ? Math.round(projected) : null,
    });
  }

  // Algebraically find the first year projected crosses 0.
  let netZeroYear: number | null = null;
  for (const row of rows) {
    if (row.projected === 0) {
      netZeroYear = row.year;
      break;
    }
  }

  return { rows, netZeroYear };
}

export type OnTrackResult = {
  onTrack: boolean;
  achieved: number;
  expectedNow: number;
  currentYear: number;
};

export function computeOnTrack(
  city: City,
  actions: ClimateAction[],
  currentYear: number
): OnTrackResult {
  const requiredAnnual = city.baseline_tons / (city.target_year - city.baseline_year);
  const expectedNow = requiredAnnual * (currentYear - city.baseline_year);
  const achieved = actions
    .filter(
      (a) =>
        (a.status === "in_progress" || a.status === "completed") &&
        a.start_year <= currentYear
    )
    .reduce((sum, a) => sum + a.annual_reduction, 0);
  return { onTrack: achieved >= expectedNow, achieved, expectedNow, currentYear };
}

export type SectorSummary = {
  sector: ClimateAction["sector"];
  total: number;
  count: number;
};

const ALL_SECTORS: ClimateAction["sector"][] = [
  "transport",
  "energy",
  "buildings",
  "waste",
  "land_use",
];

export function groupBySector(actions: ClimateAction[]): SectorSummary[] {
  const map = new Map<ClimateAction["sector"], { total: number; count: number }>();
  for (const s of ALL_SECTORS) map.set(s, { total: 0, count: 0 });
  for (const a of actions) {
    const entry = map.get(a.sector)!;
    entry.total += a.annual_reduction;
    entry.count += 1;
  }
  return ALL_SECTORS.map((sector) => ({ sector, ...map.get(sector)! }));
}
