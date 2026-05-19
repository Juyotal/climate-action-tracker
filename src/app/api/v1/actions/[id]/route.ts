import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ClimateActionUpdateSchema } from "@/lib/schemas";
import { requireAdmin } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const authErr = await requireAdmin();
  if (authErr) return authErr;
  const { id } = await params;
  const actionId = parseInt(id, 10);
  if (isNaN(actionId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = ClimateActionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const action = await prisma.climateAction.update({
    where: { id: actionId },
    data: parsed.data,
  });
  return NextResponse.json(action);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const authErr = await requireAdmin();
  if (authErr) return authErr;
  const { id } = await params;
  const actionId = parseInt(id, 10);
  if (isNaN(actionId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await prisma.climateAction.delete({ where: { id: actionId } });
  return new NextResponse(null, { status: 204 });
}
