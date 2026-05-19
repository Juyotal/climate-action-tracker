import { auth, signIn, signOut } from "@/auth";

export { auth, signIn, signOut };

/**
 * Returns a 401/403 Response if the current request is not from an admin, or null if ok.
 * Usage in route handlers: const err = await requireAdmin(); if (err) return err;
 */
export async function requireAdmin(): Promise<Response | null> {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  return null;
}
