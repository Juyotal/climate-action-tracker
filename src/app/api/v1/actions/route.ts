import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ClimateActionInsertSchema } from "@/lib/schemas";

export async function GET(req: NextRequest) {
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
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = ClimateActionInsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const action = await prisma.climateAction.create({ data: parsed.data });
  return NextResponse.json(action, { status: 201 });
}
