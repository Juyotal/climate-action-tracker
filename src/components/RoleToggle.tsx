"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function RoleToggle() {
  const router = useRouter();
  // Initialize from localStorage; default to "public"
  const [role, setRole] = useState<"public" | "admin">("public");

  useEffect(() => {
    const stored = localStorage.getItem("role");
    if (stored === "admin" || stored === "public") {
      setRole(stored);
    }
  }, []);

  function handleToggle(next: "public" | "admin") {
    if (next === role) return;
    localStorage.setItem("role", next);
    setRole(next);
    router.push(next === "admin" ? "/admin" : "/public");
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">
        Role: <span className="font-medium text-foreground">{role}</span>
      </span>
      <div className="flex rounded-full border border-border bg-muted p-0.5">
        <button
          onClick={() => handleToggle("public")}
          className={`rounded-full px-3 py-0.5 text-xs font-medium transition-colors ${
            role === "public"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Public
        </button>
        <button
          onClick={() => handleToggle("admin")}
          className={`rounded-full px-3 py-0.5 text-xs font-medium transition-colors ${
            role === "admin"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Admin
        </button>
      </div>
    </div>
  );
}
