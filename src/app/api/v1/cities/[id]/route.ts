import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CityUpdateSchema } from "@/lib/schemas";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/errors";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  return withErrorHandling(async () => {
    const { id } = await params;
    const cityId = parseInt(id, 10);
    if (isNaN(cityId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const city = await prisma.city.findUniqueOrThrow({ where: { id: cityId } });
    return NextResponse.json(city);
  });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const authErr = await requireAdmin();
  if (authErr) return authErr;

  return withErrorHandling(async () => {
    const { id } = await params;
    const cityId = parseInt(id, 10);
    if (isNaN(cityId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();
    const data = CityUpdateSchema.parse(body);

    const city = await prisma.city.update({
      where: { id: cityId },
      data,
    });
    return NextResponse.json(city);
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const authErr = await requireAdmin();
  if (authErr) return authErr;

  return withErrorHandling(async () => {
    const { id } = await params;
    const cityId = parseInt(id, 10);
    if (isNaN(cityId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.climateAction.deleteMany({ where: { cityId } }),
      prisma.city.delete({ where: { id: cityId } }),
    ]);

    return new NextResponse(null, { status: 204 });
  });
}
