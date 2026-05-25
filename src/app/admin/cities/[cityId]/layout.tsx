"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

export default function AdminCityLayout({ children }: { children: React.ReactNode }) {
  const { cityId } = useParams<{ cityId: string }>();
  const pathname = usePathname();

  const isImport = pathname.endsWith("/import");

  function tabClass(active: boolean) {
    return `pb-2 text-sm font-medium -mb-px ${
      active
        ? "border-b-2 border-foreground text-foreground"
        : "text-muted-foreground hover:text-foreground"
    }`;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <p className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground">← All cities</Link>
      </p>
      <nav className="mb-6 flex gap-6 border-b border-border">
        <Link href={`/admin/cities/${cityId}`} className={tabClass(!isImport)}>
          Actions
        </Link>
        <Link href={`/admin/cities/${cityId}/import`} className={tabClass(isImport)}>
          Import from text
        </Link>
      </nav>
      {children}
    </div>
  );
}
