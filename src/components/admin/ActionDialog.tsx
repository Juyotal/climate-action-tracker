"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAction, updateAction, type ClimateAction } from "@/lib/api";

type ActionFormData = {
  title: string;
  sector: ClimateAction["sector"];
  status: ClimateAction["status"];
  annual_reduction: string;
  start_year: string;
};

const EMPTY: ActionFormData = {
  title: "",
  sector: "transport",
  status: "planned",
  annual_reduction: "",
  start_year: String(new Date().getFullYear()),
};

type Props = {
  open: boolean;
  onClose: () => void;
  cityId: number;
  action?: ClimateAction; // undefined = add mode
  onSaved: (action: ClimateAction) => void;
};

export function ActionDialog({ open, onClose, cityId, action, onSaved }: Props) {
  const isEdit = !!action;
  const [form, setForm] = useState<ActionFormData>(EMPTY);
  const [saving, setSaving] = useState(false);

  // Reset form when dialog opens/closes or action changes
  useEffect(() => {
    if (open) {
      setForm(
        action
          ? {
              title: action.title,
              sector: action.sector,
              status: action.status,
              annual_reduction: String(action.annual_reduction),
              start_year: String(action.start_year),
            }
          : EMPTY
      );
    }
  }, [open, action]);

  function set<K extends keyof ActionFormData>(k: K, v: ActionFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const annual_reduction = parseInt(form.annual_reduction, 10);
    const start_year = parseInt(form.start_year, 10);
    if (isNaN(annual_reduction) || isNaN(start_year)) {
      toast.error("Annual reduction and start year must be numbers.");
      return;
    }
    setSaving(true);
    try {
      let saved: ClimateAction;
      if (isEdit && action) {
        saved = await updateAction(action.id, {
          title: form.title,
          sector: form.sector,
          status: form.status,
          annual_reduction,
          start_year,
        });
      } else {
        saved = await createAction({
          cityId,
          title: form.title,
          sector: form.sector,
          status: form.status,
          annual_reduction,
          start_year,
          source: "manual",
          confidence: null,
        });
      }
      toast.success(isEdit ? "Action updated." : "Action added.");
      onSaved(saved);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit action" : "Add action"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-1">
          <div className="flex flex-col gap-1">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label>Sector</Label>
              <Select value={form.sector} onValueChange={(v) => set("sector", v as ClimateAction["sector"])}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transport">Transport</SelectItem>
                  <SelectItem value="energy">Energy</SelectItem>
                  <SelectItem value="buildings">Buildings</SelectItem>
                  <SelectItem value="waste">Waste</SelectItem>
                  <SelectItem value="land_use">Land use</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v as ClimateAction["status"])}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="annual_reduction">Annual reduction (t)</Label>
              <Input
                id="annual_reduction"
                type="number"
                min={0}
                value={form.annual_reduction}
                onChange={(e) => set("annual_reduction", e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="start_year">Start year</Label>
              <Input
                id="start_year"
                type="number"
                min={2000}
                max={2100}
                value={form.start_year}
                onChange={(e) => set("start_year", e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter className="mt-1">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
