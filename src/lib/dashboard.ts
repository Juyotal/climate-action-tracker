// Pure server-side computations for the public dashboard.
// No imports from React or Next.js — these are unit-testable plain functions.

import type { City, ClimateAction } from "@/lib/api";

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
