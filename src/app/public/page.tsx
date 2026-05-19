// Public city list — server component. Open to all.

import Link from "next/link";
import type { City } from "@/lib/api";

async function fetchCities(): Promise<City[]> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/api/v1/cities`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch cities");
  return res.json();
}

export default async function PublicCityListPage() {
  const cities = await fetchCities();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-2 font-heading text-2xl font-semibold">City Climate Action Tracker</h1>
      <p className="mb-8 text-sm text-muted-foreground">Select a city to view its climate progress dashboard.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cities.map((city) => (
          <Link
            key={city.id}
            href={`/public/cities/${city.id}`}
            className="flex flex-col gap-1 rounded-xl border border-border bg-card p-5 transition-colors hover:bg-muted"
          >
            <span className="font-heading text-base font-medium">{city.name}</span>
            <span className="text-xs text-muted-foreground">
              Baseline: {city.baseline_tons.toLocaleString()} t — Target: {city.target_year}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
