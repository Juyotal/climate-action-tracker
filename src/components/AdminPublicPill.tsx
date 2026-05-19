"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

/**
 * Admin/Public toggle pill for logged-in admins.
 * When on a city-scoped route (/admin/cities/2 or /public/cities/2),
 * the opposite link goes to the sibling city-scoped route.
 * Otherwise links go to top-level /admin or /public.
 */
export function AdminPublicPill({ cityId }: { cityId?: number }) {
  const pathname = usePathname();

  const isAdmin = pathname.startsWith("/admin");

  let adminHref = "/admin";
  let publicHref = "/public";

  if (cityId != null) {
    adminHref = `/admin/cities/${cityId}`;
    publicHref = `/public/cities/${cityId}`;
  }

  return (
    <div className="flex rounded-full border border-border bg-muted p-0.5">
      <Link
        href={publicHref}
        className={`rounded-full px-3 py-0.5 text-xs font-medium transition-colors ${
          !isAdmin
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Public
      </Link>
      <Link
        href={adminHref}
        className={`rounded-full px-3 py-0.5 text-xs font-medium transition-colors ${
          isAdmin
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Admin
      </Link>
    </div>
  );
}
