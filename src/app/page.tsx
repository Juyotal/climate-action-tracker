import Link from "next/link";

export default function Home() {
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
        <Link
          href="/admin"
          className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6 transition-colors hover:bg-muted"
        >
          <span className="font-heading text-base font-medium">Admin</span>
          <span className="text-sm text-muted-foreground">
            Configure city, manage climate actions, and import from text.
          </span>
        </Link>
      </div>
    </div>
  );
}
