import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Tab nav — simple link underline pattern */}
      <nav className="mb-6 flex gap-6 border-b border-border">
        <Link
          href="/admin"
          className="pb-2 text-sm font-medium text-foreground border-b-2 border-foreground -mb-px"
        >
          Actions
        </Link>
        <Link
          href="/admin/import"
          className="pb-2 text-sm font-medium text-muted-foreground hover:text-foreground -mb-px"
        >
          Import from text
        </Link>
      </nav>
      {children}
    </div>
  );
}
