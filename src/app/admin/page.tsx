// Server Component — fetches city + actions from the API routes.
// Using API routes (not Prisma directly) keeps the boundary clean and avoids
// Prisma 7 SSR edge issues with the pg adapter.

import { CityConfigCard } from "@/components/admin/CityConfigCard";
import { ActionsTable } from "@/components/admin/ActionsTable";
import type { City, ClimateAction } from "@/lib/api";

async function fetchCity(): Promise<City> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/api/v1/cities/1`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch city");
  return res.json();
}

async function fetchActions(cityId: number): Promise<ClimateAction[]> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/api/v1/actions?cityId=${cityId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch actions");
  return res.json();
}

export default async function AdminPage() {
  const city = await fetchCity();
  const actions = await fetchActions(city.id);

  return (
    <>
      <CityConfigCard city={city} />
      <section>
        <h2 className="mb-4 font-heading text-base font-semibold">Climate actions</h2>
        <ActionsTable city={city} initialActions={actions} />
      </section>
    </>
  );
}
