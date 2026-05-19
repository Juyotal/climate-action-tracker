"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ActionDialog } from "@/components/admin/ActionDialog";
import { deleteAction, type ClimateAction, type City } from "@/lib/api";

const SECTOR_LABELS: Record<ClimateAction["sector"], string> = {
  transport: "Transport",
  energy: "Energy",
  buildings: "Buildings",
  waste: "Waste",
  land_use: "Land use",
};

function StatusBadge({ status }: { status: ClimateAction["status"] }) {
  const styles: Record<ClimateAction["status"], string> = {
    planned: "bg-muted text-muted-foreground border-border",
    in_progress: "bg-blue-100 text-blue-700 border-blue-200",
    completed: "bg-green-100 text-green-700 border-green-200",
  };
  const labels: Record<ClimateAction["status"], string> = {
    planned: "Planned",
    in_progress: "In progress",
    completed: "Completed",
  };
  return (
    <span
      className={`inline-flex h-5 items-center rounded-full border px-2 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function SourceLabel({ action }: { action: ClimateAction }) {
  if (action.source === "manual") return <span className="text-muted-foreground">Manual</span>;
  const pct = action.confidence != null ? Math.round(action.confidence * 100) : null;
  return (
    <span className="text-muted-foreground">
      AI{pct != null ? ` ${pct}%` : ""}
    </span>
  );
}

type Props = {
  city: City;
  initialActions: ClimateAction[];
};

export function ActionsTable({ city, initialActions }: Props) {
  const [actions, setActions] = useState<ClimateAction[]>(initialActions);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<ClimateAction | undefined>();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const totalReduction = actions.reduce((sum, a) => sum + a.annual_reduction, 0);

  function openAdd() {
    setEditingAction(undefined);
    setDialogOpen(true);
  }

  function openEdit(action: ClimateAction) {
    setEditingAction(action);
    setDialogOpen(true);
  }

  function handleSaved(saved: ClimateAction) {
    setActions((prev) => {
      const idx = prev.findIndex((a) => a.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this action?")) return;
    setDeletingId(id);
    try {
      await deleteAction(id);
      setActions((prev) => prev.filter((a) => a.id !== id));
      toast.success("Action deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold">{city.name}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {actions.length} actions · {totalReduction.toLocaleString()} t/yr planned
          </p>
        </div>
        <Button onClick={openAdd}>Add action</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Sector</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Annual reduction (t)</TableHead>
            <TableHead>Start year</TableHead>
            <TableHead>Source</TableHead>
            <TableHead />
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {actions.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                No actions yet.
              </TableCell>
            </TableRow>
          )}
          {actions.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="max-w-xs truncate font-medium">{a.title}</TableCell>
              <TableCell>{SECTOR_LABELS[a.sector]}</TableCell>
              <TableCell>
                <StatusBadge status={a.status} />
              </TableCell>
              <TableCell className="text-right">
                {a.annual_reduction.toLocaleString()}
              </TableCell>
              <TableCell>{a.start_year}</TableCell>
              <TableCell>
                <SourceLabel action={a} />
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit(a)}
                >
                  Edit
                </Button>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(a.id)}
                  disabled={deletingId === a.id}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ActionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        cityId={city.id}
        action={editingAction}
        onSaved={handleSaved}
      />
    </div>
  );
}
