import { z } from "zod";

export const SectorEnum = z.enum([
  "transport",
  "energy",
  "buildings",
  "waste",
  "land_use",
]);

export const StatusEnum = z.enum(["planned", "in_progress", "completed"]);

export const SourceEnum = z.enum(["manual", "ai"]);

// Used by POST /api/v1/actions and the AI extraction tool
export const ClimateActionInsertSchema = z.object({
  cityId: z.number().int().positive(),
  title: z.string().min(1),
  sector: SectorEnum,
  status: StatusEnum,
  annual_reduction: z.number().int().nonnegative(),
  start_year: z.number().int().min(2000).max(2100),
  source: SourceEnum,
  confidence: z.number().min(0).max(1).nullable().optional(),
});

// Used by PUT /api/v1/actions/[id] — all fields optional
export const ClimateActionUpdateSchema = ClimateActionInsertSchema.partial().omit(
  { cityId: true }
);

export const CityInsertSchema = z.object({
  name: z.string().min(1),
  baseline_tons: z.number().int().positive(),
  baseline_year: z.number().int().min(2000).max(2100),
  target_year: z.number().int().min(2025).max(2100),
});

export const CityUpdateSchema = CityInsertSchema.partial();

// Used as the AI tool input schema for extract_climate_actions.
// Omits cityId (server-set) and source (server-sets "ai"). Requires confidence.
export const AIExtractedActionSchema = z.object({
  title: z.string().min(1),
  sector: SectorEnum,
  status: StatusEnum,
  annual_reduction: z.number().int().nonnegative(),
  start_year: z.number().int().min(2000).max(2100),
  confidence: z.number().min(0).max(1),
});
