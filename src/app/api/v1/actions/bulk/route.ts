import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AIExtractedActionSchema } from "@/lib/schemas";
import { z } from "zod";

const BulkInsertSchema = z.object({
  cityId: z.number().int().positive(),
  actions: z.array(AIExtractedActionSchema).min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = BulkInsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { cityId, actions } = parsed.data;

  const created = await prisma.$transaction(
    actions.map((a) =>
      prisma.climateAction.create({
        data: { ...a, cityId, source: "ai" },
      })
    )
  );

  return NextResponse.json({ created }, { status: 201 });
}
