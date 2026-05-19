import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CityUpdateSchema } from "@/lib/schemas";
import { requireAdmin } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const cityId = parseInt(id, 10);
  if (isNaN(cityId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const city = await prisma.city.findUnique({ where: { id: cityId } });
  if (!city) {
    return NextResponse.json({ error: "City not found" }, { status: 404 });
  }
  return NextResponse.json(city);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const authErr = await requireAdmin();
  if (authErr) return authErr;
  const { id } = await params;
  const cityId = parseInt(id, 10);
  if (isNaN(cityId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = CityUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const city = await prisma.city.update({
    where: { id: cityId },
    data: parsed.data,
  });
  return NextResponse.json(city);
}
