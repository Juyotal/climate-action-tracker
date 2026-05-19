/**
 * Seed file for City Climate Action Tracker.
 *
 * Source data notes:
 * - baseline_year is NOT in the source JSON; defaulting to 2020 (per CLAUDE.md §11).
 * - "in progress" normalized to in_progress (enum value).
 * - "land use" normalized to land_use (enum value).
 * - All actions seeded with source: "manual" and confidence: null.
 *
 * Idempotency: uses upsert on city id=1; wipes city's actions then re-inserts.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const city = await prisma.city.upsert({
    where: { id: 1 },
    update: {
      name: "Greenville",
      baseline_tons: 500000,
      baseline_year: 2020,
      target_year: 2035,
    },
    create: {
      name: "Greenville",
      baseline_tons: 500000,
      baseline_year: 2020,
      target_year: 2035,
    },
  });

  // Wipe existing actions for this city, then re-insert (idempotent)
  await prisma.climateAction.deleteMany({ where: { cityId: city.id } });

  await prisma.climateAction.createMany({
    data: [
      {
        cityId: city.id,
        title: "Expand bike lane network",
        sector: "transport",
        annual_reduction: 12000,
        status: "in_progress",
        start_year: 2024,
        source: "manual",
        confidence: null,
      },
      {
        cityId: city.id,
        title: "Solar panel incentive program",
        sector: "energy",
        annual_reduction: 45000,
        status: "in_progress",
        start_year: 2023,
        source: "manual",
        confidence: null,
      },
      {
        cityId: city.id,
        title: "Municipal building retrofits",
        sector: "buildings",
        annual_reduction: 18000,
        status: "planned",
        start_year: 2026,
        source: "manual",
        confidence: null,
      },
      {
        cityId: city.id,
        title: "Organic waste composting program",
        sector: "waste",
        annual_reduction: 8000,
        status: "completed",
        start_year: 2022,
        source: "manual",
        confidence: null,
      },
      {
        cityId: city.id,
        title: "Urban reforestation initiative",
        sector: "land_use",
        annual_reduction: 15000,
        status: "planned",
        start_year: 2025,
        source: "manual",
        confidence: null,
      },
      {
        cityId: city.id,
        title: "EV fleet transition for public transit",
        sector: "transport",
        annual_reduction: 30000,
        status: "planned",
        start_year: 2026,
        source: "manual",
        confidence: null,
      },
    ],
  });

  console.log(`Seeded city "${city.name}" with 6 actions.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
