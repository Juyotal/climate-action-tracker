/**
 * Seed file for City Climate Action Tracker.
 *
 * Source data notes:
 * - baseline_year is NOT in the source JSON for Greenville; defaulting to 2020 (per CLAUDE.md §11).
 * - "in progress" normalized to in_progress (enum value).
 * - "land use" normalized to land_use (enum value).
 * - All actions seeded with source: "manual" and confidence: null.
 *
 * Idempotency:
 * - Cities: upsert keyed by name.
 * - Actions: wipe-and-reinsert per city.
 * - User: upsert keyed by email.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // ── Greenville ──────────────────────────────────────────────────────────────
  const greenville = await prisma.city.upsert({
    where: { name: "Greenville" },
    update: {
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

  await prisma.climateAction.deleteMany({ where: { cityId: greenville.id } });
  await prisma.climateAction.createMany({
    data: [
      {
        cityId: greenville.id,
        title: "Expand bike lane network",
        sector: "transport",
        annual_reduction: 12000,
        status: "in_progress",
        start_year: 2024,
        source: "manual",
        confidence: null,
      },
      {
        cityId: greenville.id,
        title: "Solar panel incentive program",
        sector: "energy",
        annual_reduction: 45000,
        status: "in_progress",
        start_year: 2023,
        source: "manual",
        confidence: null,
      },
      {
        cityId: greenville.id,
        title: "Municipal building retrofits",
        sector: "buildings",
        annual_reduction: 18000,
        status: "planned",
        start_year: 2026,
        source: "manual",
        confidence: null,
      },
      {
        cityId: greenville.id,
        title: "Organic waste composting program",
        sector: "waste",
        annual_reduction: 8000,
        status: "completed",
        start_year: 2022,
        source: "manual",
        confidence: null,
      },
      {
        cityId: greenville.id,
        title: "Urban reforestation initiative",
        sector: "land_use",
        annual_reduction: 15000,
        status: "planned",
        start_year: 2025,
        source: "manual",
        confidence: null,
      },
      {
        cityId: greenville.id,
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
  console.log(`Seeded city "${greenville.name}" with 6 actions.`);

  // ── Riverdale ───────────────────────────────────────────────────────────────
  const riverdale = await prisma.city.upsert({
    where: { name: "Riverdale" },
    update: {
      baseline_tons: 180000,
      baseline_year: 2020,
      target_year: 2040,
    },
    create: {
      name: "Riverdale",
      baseline_tons: 180000,
      baseline_year: 2020,
      target_year: 2040,
    },
  });

  await prisma.climateAction.deleteMany({ where: { cityId: riverdale.id } });
  await prisma.climateAction.createMany({
    data: [
      {
        cityId: riverdale.id,
        title: "Replace municipal streetlights with LEDs",
        sector: "energy",
        annual_reduction: 2500,
        status: "in_progress",
        start_year: 2024,
        source: "manual",
        confidence: null,
      },
      {
        cityId: riverdale.id,
        title: "Curbside compost pilot",
        sector: "waste",
        annual_reduction: 1500,
        status: "planned",
        start_year: 2027,
        source: "manual",
        confidence: null,
      },
      {
        cityId: riverdale.id,
        title: "Downtown protected bike lanes",
        sector: "transport",
        annual_reduction: 4000,
        status: "planned",
        start_year: 2028,
        source: "manual",
        confidence: null,
      },
    ],
  });
  console.log(`Seeded city "${riverdale.name}" with 3 actions.`);

  // ── Lakewood ────────────────────────────────────────────────────────────────
  const lakewood = await prisma.city.upsert({
    where: { name: "Lakewood" },
    update: {
      baseline_tons: 320000,
      baseline_year: 2018,
      target_year: 2030,
    },
    create: {
      name: "Lakewood",
      baseline_tons: 320000,
      baseline_year: 2018,
      target_year: 2030,
    },
  });

  await prisma.climateAction.deleteMany({ where: { cityId: lakewood.id } });
  await prisma.climateAction.createMany({
    data: [
      {
        cityId: lakewood.id,
        title: "Citywide rooftop solar mandate",
        sector: "energy",
        annual_reduction: 60000,
        status: "completed",
        start_year: 2020,
        source: "manual",
        confidence: null,
      },
      {
        cityId: lakewood.id,
        title: "Electrify entire bus fleet",
        sector: "transport",
        annual_reduction: 40000,
        status: "in_progress",
        start_year: 2022,
        source: "manual",
        confidence: null,
      },
      {
        cityId: lakewood.id,
        title: "Net-zero new building code",
        sector: "buildings",
        annual_reduction: 25000,
        status: "in_progress",
        start_year: 2021,
        source: "manual",
        confidence: null,
      },
      {
        cityId: lakewood.id,
        title: "Lakeside wetland restoration",
        sector: "land_use",
        annual_reduction: 18000,
        status: "completed",
        start_year: 2019,
        source: "manual",
        confidence: null,
      },
      {
        cityId: lakewood.id,
        title: "Zero-waste-to-landfill goal",
        sector: "waste",
        annual_reduction: 12000,
        status: "in_progress",
        start_year: 2023,
        source: "manual",
        confidence: null,
      },
    ],
  });
  console.log(`Seeded city "${lakewood.name}" with 5 actions.`);

  // ── Admin user ──────────────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in env.");
  }
  const password_hash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password_hash, role: "admin" },
    create: { email: adminEmail, password_hash, role: "admin" },
  });
  console.log(`Seeded admin user "${adminEmail}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
