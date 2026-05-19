import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="mb-2 font-heading text-2xl font-semibold">
        City Climate Action Tracker
      </h1>
      <p className="mb-10 text-sm text-muted-foreground">
        Choose a view to continue.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/public"
          className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6 transition-colors hover:bg-muted"
        >
          <span className="font-heading text-base font-medium">Public dashboard</span>
          <span className="text-sm text-muted-foreground">
            View city totals, sector breakdown, and on-track indicator.
          </span>
        </Link>

        {isAdmin ? (
          <Link
            href="/admin"
            className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6 transition-colors hover:bg-muted"
          >
            <span className="font-heading text-base font-medium">Admin</span>
            <span className="text-sm text-muted-foreground">
              Configure city, manage climate actions, and import from text.
            </span>
          </Link>
        ) : (
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6">
            <span className="font-heading text-base font-medium text-muted-foreground">Admin</span>
            <span className="text-sm text-muted-foreground">
              Sign in to access city management.
            </span>
            <Link
              href="/login"
              className="mt-2 w-fit rounded-md bg-foreground px-3 py-1 text-sm font-medium text-background hover:opacity-80"
            >
              Log in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
