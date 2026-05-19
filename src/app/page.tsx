import { prisma } from "@/lib/prisma";

export default async function Home() {
  const city = await prisma.city.findFirst({
    include: { _count: { select: { actions: true } } },
  });

  if (!city) {
    return (
      <main className="p-8">
        <p>No city found. Run the seed: <code>npx prisma db seed</code></p>
      </main>
    );
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">{city.name} Climate Action Tracker</h1>
      <p className="mt-2 text-gray-600">
        {city._count.actions} actions tracked · Baseline: {city.baseline_tons.toLocaleString()} t CO₂ · Target year: {city.target_year}
      </p>
    </main>
  );
}
