import Link from "next/link";
import { RoleToggle } from "@/components/RoleToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-heading text-sm font-semibold">
          City Climate Action Tracker
        </Link>
        <RoleToggle />
      </div>
    </header>
  );
}
