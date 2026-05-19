import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AIExtractedActionSchema } from "@/lib/schemas";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/errors";

const BulkInsertSchema = z.object({
  cityId: z.number().int().positive(),
  actions: z.array(AIExtractedActionSchema).min(1),
});

export async function POST(req: NextRequest) {
  const authErr = await requireAdmin();
  if (authErr) return authErr;

  return withErrorHandling(async () => {
    const body = await req.json();
    const { cityId, actions } = BulkInsertSchema.parse(body);

    const city = await prisma.city.findUnique({ where: { id: cityId } });
    if (!city) return NextResponse.json({ error: "City not found." }, { status: 404 });

    const invalid = actions.filter(
      (a) => a.start_year < city.baseline_year || a.start_year >= city.target_year
    );
    if (invalid.length > 0) {
      return NextResponse.json(
        {
          error: `${invalid.length} action(s) have a start year outside the valid range (${city.baseline_year}–${city.target_year - 1}): ${invalid.map((a) => `"${a.title}"`).join(", ")}.`,
        },
        { status: 400 }
      );
    }

    const created = await prisma.$transaction(
      actions.map((a) => prisma.climateAction.create({ data: { ...a, cityId, source: "ai" } }))
    );

    return NextResponse.json({ created }, { status: 201 });
  });
}
