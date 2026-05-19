"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updateCity, type City } from "@/lib/api";

type Props = { city: City };

export function CityConfigCard({ city }: Props) {
  const [baselineTons, setBaselineTons] = useState(String(city.baseline_tons));
  const [baselineYear, setBaselineYear] = useState(String(city.baseline_year));
  const [targetYear, setTargetYear] = useState(String(city.target_year));
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateCity(city.id, {
        baseline_tons: parseInt(baselineTons, 10),
        baseline_year: parseInt(baselineYear, 10),
        target_year: parseInt(targetYear, 10),
      });
      toast.success("City config saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>City config</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="baseline_tons">Baseline emissions (t CO₂)</Label>
            <Input
              id="baseline_tons"
              type="number"
              min={1}
              value={baselineTons}
              onChange={(e) => setBaselineTons(e.target.value)}
              className="w-40"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="baseline_year">Baseline year</Label>
            <Input
              id="baseline_year"
              type="number"
              min={2000}
              max={2100}
              value={baselineYear}
              onChange={(e) => setBaselineYear(e.target.value)}
              className="w-28"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="target_year">Target year</Label>
            <Input
              id="target_year"
              type="number"
              min={2025}
              max={2100}
              value={targetYear}
              onChange={(e) => setTargetYear(e.target.value)}
              className="w-28"
              required
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
