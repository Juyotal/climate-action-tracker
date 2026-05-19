import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const cities = await prisma.city.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(cities);
}
