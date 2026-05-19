import Link from "next/link";

type Props = {
  children: React.ReactNode;
  params: Promise<{ cityId: string }>;
};

export default async function AdminCityLayout({ children, params }: Props) {
  const { cityId } = await params;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <p className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground">← All cities</Link>
      </p>
      {/* Tab nav — city-scoped */}
      <nav className="mb-6 flex gap-6 border-b border-border">
        <Link
          href={`/admin/cities/${cityId}`}
          className="pb-2 text-sm font-medium text-foreground border-b-2 border-foreground -mb-px"
        >
          Actions
        </Link>
        <Link
          href={`/admin/cities/${cityId}/import`}
          className="pb-2 text-sm font-medium text-muted-foreground hover:text-foreground -mb-px"
        >
          Import from text
        </Link>
      </nav>
      {children}
    </div>
  );
}
