"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { extractActions, bulkCreate, type ExtractedAction } from "@/lib/api";

const SECTOR_LABELS: Record<ExtractedAction["sector"], string> = {
  transport: "Transport",
  energy: "Energy",
  buildings: "Buildings",
  waste: "Waste",
  land_use: "Land use",
};

const STATUS_LABELS: Record<ExtractedAction["status"], string> = {
  planned: "Planned",
  in_progress: "In progress",
  completed: "Completed",
};

type Props = { cityId: number };

export function ImportClient({ cityId }: Props) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedAction[]>([]);
  const [skipped, setSkipped] = useState<{ reason: string; raw: unknown }[]>([]);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  async function handleExtract(e: React.FormEvent) {
    e.preventDefault();
    setExtracting(true);
    setExtracted([]);
    setSkipped([]);
    setChecked(new Set());
    try {
      const result = await extractActions(text, cityId);
      setExtracted(result.extracted);
      setSkipped(result.skipped);
      // Pre-check all valid rows
      setChecked(new Set(result.extracted.map((_, i) => i)));
      if (result.extracted.length === 0) {
        toast.info("No actions extracted.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Extraction failed.");
    } finally {
      setExtracting(false);
    }
  }

  function toggleCheck(idx: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function toggleAll() {
    if (checked.size === extracted.length) {
      setChecked(new Set());
    } else {
      setChecked(new Set(extracted.map((_, i) => i)));
    }
  }

  async function handleSave() {
    const selected = extracted.filter((_, i) => checked.has(i));
    if (selected.length === 0) {
      toast.error("Select at least one action to save.");
      return;
    }
    setSaving(true);
    try {
      const { created } = await bulkCreate(cityId, selected);
      toast.success(`Saved ${created.length} action${created.length !== 1 ? "s" : ""}.`);
      setExtracted([]);
      setSkipped([]);
      setChecked(new Set());
      setText("");
      router.push(`/admin/cities/${cityId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-xl font-semibold">Import actions from text</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste a policy document, meeting notes, or any text describing climate actions. Claude will extract structured actions for review.
        </p>
      </div>

      <form onSubmit={handleExtract} className="flex flex-col gap-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste text here…"
          className="min-h-40"
          required
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={extracting || text.length < 20}>
            {extracting ? "Extracting…" : "Extract actions"}
          </Button>
        </div>
      </form>

      {extracted.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold">
              Review ({extracted.length} extracted)
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={toggleAll}>
                {checked.size === extracted.length ? "Deselect all" : "Select all"}
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || checked.size === 0}
              >
                {saving ? "Saving…" : `Save selected (${checked.size})`}
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Title</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Annual reduction (t)</TableHead>
                <TableHead>Start year</TableHead>
                <TableHead>Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {extracted.map((a, i) => (
                <TableRow key={i} className={checked.has(i) ? "" : "opacity-50"}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={checked.has(i)}
                      onChange={() => toggleCheck(i)}
                      className="h-4 w-4 cursor-pointer"
                    />
                  </TableCell>
                  <TableCell className="max-w-xs truncate font-medium">{a.title}</TableCell>
                  <TableCell>{SECTOR_LABELS[a.sector]}</TableCell>
                  <TableCell>{STATUS_LABELS[a.status]}</TableCell>
                  <TableCell className="text-right">{a.annual_reduction.toLocaleString()}</TableCell>
                  <TableCell>{a.start_year}</TableCell>
                  <TableCell>{Math.round(a.confidence * 100)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {skipped.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <h3 className="mb-2 text-sm font-medium text-destructive">
            Could not parse ({skipped.length})
          </h3>
          <ul className="flex flex-col gap-1">
            {skipped.map((s, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                {s.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
