import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CityInsertSchema } from "@/lib/schemas";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/errors";

export async function GET() {
  return withErrorHandling(async () => {
    const cities = await prisma.city.findMany({ orderBy: { id: "asc" } });
    return NextResponse.json(cities);
  });
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdmin();
  if (authErr) return authErr;

  return withErrorHandling(async () => {
    const body = await req.json();
    const data = CityInsertSchema.parse(body);

    const city = await prisma.city.create({ data });
    return NextResponse.json(city, { status: 201 });
  });
}
