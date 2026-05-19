import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { AdminPublicPill } from "@/components/AdminPublicPill";

export async function Header() {
  const session = await auth();
  const user = session?.user;

  // Extract cityId from the current path for city-aware pill
  const headersList = await headers();
  const pathname = headersList.get("x-invoke-path") ?? headersList.get("x-pathname") ?? "";

  // Match /admin/cities/N or /public/cities/N
  const cityMatch = pathname.match(/\/(?:admin|public)\/cities\/(\d+)/);
  const cityId = cityMatch ? parseInt(cityMatch[1], 10) : undefined;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-heading text-sm font-semibold">
          City Climate Action Tracker
        </Link>

        <div className="flex items-center gap-4">
          {!user && (
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Log in
            </Link>
          )}

          {user && user.role === "admin" && (
            <AdminPublicPill cityId={cityId} />
          )}

          {user && (
            <>
              <span className="text-sm text-muted-foreground">{user.email}</span>
              <LogoutButton />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
