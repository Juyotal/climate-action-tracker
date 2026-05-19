import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ClimateActionInsertSchema } from "@/lib/schemas";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/errors";

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const { searchParams } = new URL(req.url);
    const cityIdParam = searchParams.get("cityId");

    const where = cityIdParam
      ? { cityId: parseInt(cityIdParam, 10) }
      : undefined;

    const actions = await prisma.climateAction.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(actions);
  });
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdmin();
  if (authErr) return authErr;

  return withErrorHandling(async () => {
    const body = await req.json();
    const data = ClimateActionInsertSchema.parse(body);

    const city = await prisma.city.findUnique({ where: { id: data.cityId } });
    if (!city) return NextResponse.json({ error: "City not found." }, { status: 404 });

    if (data.start_year < city.baseline_year || data.start_year >= city.target_year) {
      return NextResponse.json(
        { error: `Start year must be between ${city.baseline_year} and ${city.target_year - 1}.` },
        { status: 400 }
      );
    }

    const action = await prisma.climateAction.create({ data });
    return NextResponse.json(action, { status: 201 });
  });
}
