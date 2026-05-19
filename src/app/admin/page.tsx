import type { City } from "@/lib/api";
import { CityList } from "@/components/admin/CityList";

async function fetchCities(): Promise<City[]> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/api/v1/cities`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch cities");
  return res.json();
}

export default async function AdminCityListPage() {
  const cities = await fetchCities();
  return <CityList initialCities={cities} />;
}
