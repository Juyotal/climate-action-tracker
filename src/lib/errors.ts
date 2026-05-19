import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export async function withErrorHandling<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "ValidationError", issues: err.issues },
        { status: 400 },
      );
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        return NextResponse.json({ error: "NotFound" }, { status: 404 });
      }
      if (err.code === "P2002") {
        console.log(err)
        return NextResponse.json({ error: "A record with this name/title already exists." }, { status: 409 });
      }
    }
    console.error(err);
    return NextResponse.json({ error: "InternalError" }, { status: 500 });
  }
}
