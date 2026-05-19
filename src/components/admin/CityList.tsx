"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { createCity, deleteCity, type City } from "@/lib/api";

type FormData = {
  name: string;
  baseline_tons: string;
  baseline_year: string;
  target_year: string;
};

const EMPTY: FormData = {
  name: "",
  baseline_tons: "",
  baseline_year: "2020",
  target_year: "2035",
};

export function CityList({ initialCities }: { initialCities: City[] }) {
  const router = useRouter();
  const [cities, setCities] = useState(initialCities);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof FormData>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const baseline_tons = parseInt(form.baseline_tons, 10);
    const baseline_year = parseInt(form.baseline_year, 10);
    const target_year = parseInt(form.target_year, 10);
    if (isNaN(baseline_tons) || isNaN(baseline_year) || isNaN(target_year)) {
      toast.error("Baseline tons, baseline year, and target year must be numbers.");
      return;
    }
    setSaving(true);
    try {
      const city = await createCity({ name: form.name, baseline_tons, baseline_year, target_year });
      setCities((prev) => [...prev, city]);
      toast.success(`${city.name} added.`);
      setDialogOpen(false);
      setForm(EMPTY);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add city.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(city: City) {
    if (!window.confirm(`Delete "${city.name}" and all its actions? This cannot be undone.`)) return;
    try {
      await deleteCity(city.id);
      setCities((prev) => prev.filter((c) => c.id !== city.id));
      toast.success(`${city.name} deleted.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete city.");
    }
  }

  return (
    <>
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-heading text-xl font-semibold">Cities</h1>
          <Button size="sm" onClick={() => setDialogOpen(true)}>Add city</Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((city) => (
            <div
              key={city.id}
              className="group relative flex flex-col gap-1 rounded-xl border border-border bg-card p-5 transition-colors hover:bg-muted"
            >
              <Link href={`/admin/cities/${city.id}`} className="flex flex-col gap-1">
                <span className="font-heading text-base font-medium">{city.name}</span>
                <span className="text-xs text-muted-foreground">
                  Baseline: {city.baseline_tons.toLocaleString()} t — Target: {city.target_year}
                </span>
              </Link>
              <button
                onClick={() => handleDelete(city)}
                className="absolute right-3 top-3 hidden rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:block"
                aria-label={`Delete ${city.name}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (!o) {
            setDialogOpen(false);
            setForm(EMPTY);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add city</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="flex flex-col gap-3 pt-1">
            <div className="flex flex-col gap-1">
              <Label htmlFor="city-name">Name</Label>
              <Input
                id="city-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="baseline-tons">Baseline (t)</Label>
                <Input
                  id="baseline-tons"
                  type="number"
                  min={1}
                  value={form.baseline_tons}
                  onChange={(e) => set("baseline_tons", e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="baseline-year">Baseline year</Label>
                <Input
                  id="baseline-year"
                  type="number"
                  min={2000}
                  max={2100}
                  value={form.baseline_year}
                  onChange={(e) => set("baseline_year", e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="target-year">Target year</Label>
                <Input
                  id="target-year"
                  type="number"
                  min={2025}
                  max={2100}
                  value={form.target_year}
                  onChange={(e) => set("target_year", e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter className="mt-1">
              <Button type="submit" disabled={saving}>
                {saving ? "Adding…" : "Add city"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
