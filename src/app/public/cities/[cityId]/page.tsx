// /public/cities/[cityId] — read-only climate dashboard. Server Component.

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { City, ClimateAction } from "@/lib/api";
import { computeOnTrack, groupBySector, computeProjection } from "@/lib/dashboard";
import ProjectionChart from "@/components/dashboard/ProjectionChart";

type Props = { params: Promise<{ cityId: string }> };

const SECTOR_LABELS: Record<ClimateAction["sector"], string> = {
  transport: "Transport",
  energy: "Energy",
  buildings: "Buildings",
  waste: "Waste",
  land_use: "Land use",
};

async function fetchCity(id: number): Promise<City> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/api/v1/cities/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch city");
  return res.json();
}

async function fetchActions(cityId: number): Promise<ClimateAction[]> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/api/v1/actions?cityId=${cityId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch actions");
  return res.json();
}

function StatusBadge({ status }: { status: ClimateAction["status"] }) {
  const styles: Record<ClimateAction["status"], string> = {
    planned: "bg-muted text-muted-foreground border-border",
    in_progress: "bg-blue-100 text-blue-700 border-blue-200",
    completed: "bg-green-100 text-green-700 border-green-200",
  };
  const labels: Record<ClimateAction["status"], string> = {
    planned: "Planned",
    in_progress: "In progress",
    completed: "Completed",
  };
  return (
    <span
      className={`inline-flex h-5 items-center rounded-full border px-2 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function SourceLabel({ action }: { action: ClimateAction }) {
  if (action.source === "manual") return <span className="text-muted-foreground">Manual</span>;
  const pct = action.confidence != null ? Math.round(action.confidence * 100) : null;
  return (
    <span className="text-muted-foreground">
      AI{pct != null ? ` ${pct}%` : ""}
    </span>
  );
}

export default async function PublicCityDashboardPage({ params }: Props) {
  const { cityId: cityIdStr } = await params;
  const cityId = parseInt(cityIdStr, 10);
  const city = await fetchCity(cityId);
  const actions = await fetchActions(cityId);
  const currentYear = new Date().getFullYear();

  const onTrack = computeOnTrack(city, actions, currentYear);
  const sectorSummaries = groupBySector(actions);
  const { rows: projectionRows, netZeroYear } = computeProjection(city, actions, currentYear);
  const onTrackProjection =
    netZeroYear != null && netZeroYear <= city.target_year;

  const totalCommitted = actions
    .filter(
      (a) =>
        (a.status === "in_progress" || a.status === "completed") &&
        a.start_year <= currentYear
    )
    .reduce((sum, a) => sum + a.annual_reduction, 0);

  const maxSectorTotal = Math.max(...sectorSummaries.map((s) => s.total), 1);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 flex flex-col gap-8">
      {/* Back link */}
      <p className="text-sm text-muted-foreground">
        <Link href="/public" className="hover:text-foreground">← All cities</Link>
      </p>

      {/* City heading */}
      <div>
        <h1 className="font-heading text-2xl font-semibold">{city.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Climate progress dashboard</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Baseline emissions (t CO₂/yr)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{city.baseline_tons.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Achieved &amp; in progress (t/yr)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totalCommitted.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              On-track status
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <span
              className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-sm font-semibold ${
                onTrack.onTrack
                  ? "bg-green-100 text-green-700 border-green-200"
                  : "bg-red-100 text-red-700 border-red-200"
              }`}
            >
              {onTrack.onTrack ? "On track ✓" : "Off track"}
            </span>
            <p className="text-xs text-muted-foreground">
              {onTrack.achieved.toLocaleString()} t/yr achieved vs{" "}
              {Math.round(onTrack.expectedNow).toLocaleString()} t/yr expected by {currentYear}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Projection chart */}
      <ProjectionChart
        rows={projectionRows}
        targetYear={city.target_year}
        netZeroYear={netZeroYear}
        onTrackProjection={onTrackProjection}
      />

      {/* Sector breakdown */}
      <div>
        <h2 className="mb-4 font-heading text-base font-semibold">Sector breakdown</h2>
        <div className="flex flex-col gap-3">
          {sectorSummaries.map(({ sector, total, count }) => {
            const pct = Math.round((total / maxSectorTotal) * 100);
            return (
              <div key={sector} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {SECTOR_LABELS[sector]} — {total.toLocaleString()} t/yr ({count}{" "}
                    {count === 1 ? "action" : "actions"})
                  </span>
                  <span className="text-muted-foreground">{pct}%</span>
                </div>
                <div className="h-3 w-full rounded bg-muted">
                  <div
                    className="h-3 rounded bg-emerald-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions list */}
      <div>
        <h2 className="mb-4 font-heading text-base font-semibold">All actions</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Sector</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Annual reduction (t)</TableHead>
              <TableHead>Start year</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {actions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No actions yet.
                </TableCell>
              </TableRow>
            )}
            {actions.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="max-w-xs truncate font-medium">{a.title}</TableCell>
                <TableCell>{SECTOR_LABELS[a.sector]}</TableCell>
                <TableCell>
                  <StatusBadge status={a.status} />
                </TableCell>
                <TableCell className="text-right">
                  {a.annual_reduction.toLocaleString()}
                </TableCell>
                <TableCell>{a.start_year}</TableCell>
                <TableCell>
                  <SourceLabel action={a} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
