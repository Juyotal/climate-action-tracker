// Per-city admin page — server component.

import { CityConfigCard } from "@/components/admin/CityConfigCard";
import { ActionsTable } from "@/components/admin/ActionsTable";
import type { City, ClimateAction } from "@/lib/api";

type Props = { params: Promise<{ cityId: string }> };

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

export default async function AdminCityPage({ params }: Props) {
  const { cityId: cityIdStr } = await params;
  const cityId = parseInt(cityIdStr, 10);
  const city = await fetchCity(cityId);
  const actions = await fetchActions(cityId);

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
