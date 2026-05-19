import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ClimateActionUpdateSchema } from "@/lib/schemas";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/errors";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const authErr = await requireAdmin();
  if (authErr) return authErr;

  return withErrorHandling(async () => {
    const { id } = await params;
    const actionId = parseInt(id, 10);
    if (isNaN(actionId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();
    const data = ClimateActionUpdateSchema.parse(body);

    const existing = await prisma.climateAction.findUniqueOrThrow({ where: { id: actionId } });

    if (data.start_year !== undefined) {
      const city = await prisma.city.findUnique({ where: { id: existing.cityId } });
      if (!city) return NextResponse.json({ error: "City not found." }, { status: 404 });

      const start_year = data.start_year ?? existing.start_year;
      if (start_year < city.baseline_year || start_year >= city.target_year) {
        return NextResponse.json(
          { error: `Start year must be between ${city.baseline_year} and ${city.target_year - 1}.` },
          { status: 400 }
        );
      }
    }

    const action = await prisma.climateAction.update({ where: { id: actionId }, data });
    return NextResponse.json(action);
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const authErr = await requireAdmin();
  if (authErr) return authErr;

  return withErrorHandling(async () => {
    const { id } = await params;
    const actionId = parseInt(id, 10);
    if (isNaN(actionId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await prisma.climateAction.delete({ where: { id: actionId } });
    return new NextResponse(null, { status: 204 });
  });
}
