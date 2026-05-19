import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  AIExtractedActionSchema,
  AIExtractToolInputSchema,
} from "@/lib/schemas";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/errors";

const RequestSchema = z.object({
  text: z.string().min(20),
  cityId: z.number().int().positive(),
});

// Client initialized lazily inside handler to ensure env vars are loaded.
let _client: Anthropic | null = null;
function getClient() {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

// Derived from AIExtractToolInputSchema — single source of truth between
// server-side Zod validation and the Anthropic tool's declared input schema.
const TOOL_INPUT_SCHEMA = z.toJSONSchema(
  AIExtractToolInputSchema
) as Anthropic.Tool["input_schema"];

function buildSystemPrompt(): string {
  const currentYear = new Date().getFullYear();
  return [
    "You extract structured climate-action records from a city official's free-text notes.",
    "",
    "Sectors:",
    "- TRANSPORT: buses, EVs, bike lanes, public transit, fleets",
    "- ENERGY: solar, wind, grid, generation, storage",
    "- BUILDINGS: retrofits, insulation, HVAC, efficiency upgrades",
    "- WASTE: composting, recycling, landfill capture",
    "- LAND_USE: trees, reforestation, parks, agriculture, green space",
    "",
    "Status:",
    "- PLANNED: future intent, not yet started",
    "- IN_PROGRESS: currently underway",
    "- COMPLETED: already finished",
    "",
    "Rules:",
    `- If startYear is not stated, default to ${currentYear}.`,
    "- If annualReductionTons is explicit in the text, use it verbatim and set confidence > 0.85.",
    "- If you must estimate the reduction, be conservative and set confidence < 0.6.",
    "- Skip vague statements (e.g. 'we care about sustainability') — only extract concrete, named actions.",
    `- Always call the extract_climate_actions tool. Never reply with plain text.`,
  ].join("\n");
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdmin();
  if (authErr) return authErr;

  return withErrorHandling(async () => {
    const body = await req.json();
    const { text } = RequestSchema.parse(body);

    let response: Anthropic.Message;
    try {
      response = await getClient().messages.create(
        {
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: buildSystemPrompt(),
          tools: [
            {
              name: "extract_climate_actions",
              description:
                "Extract structured climate actions from the provided text. For each action, assign a confidence score (0–1) reflecting how certain you are about the extracted values.",
              input_schema: TOOL_INPUT_SCHEMA,
            },
          ],
          tool_choice: { type: "auto" },
          messages: [{ role: "user", content: text }]
        },
        { signal: AbortSignal.timeout(30000) }
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: `Anthropic call failed: ${message}` },
        { status: 502 }
      );
    }

    // Find the tool_use block; ignore everything else.
    const toolBlock = response.content.find((b) => b.type === "tool_use");

    const extracted: z.infer<typeof AIExtractedActionSchema>[] = [];
    const skipped: { reason: string; raw: unknown }[] = [];

    if (toolBlock && toolBlock.type === "tool_use") {
      const raw = toolBlock.input as { actions?: unknown[] };
      const items: unknown[] = Array.isArray(raw.actions) ? raw.actions : [];

      for (const item of items) {
        const result = AIExtractedActionSchema.safeParse(item);
        if (result.success) {
          extracted.push(result.data);
        } else {
          skipped.push({
            reason: result.error.issues.map((i) => i.message).join("; "),
            raw: item,
          });
        }
      }
    }

    const responseBody: {
      extracted: typeof extracted;
      skipped: typeof skipped;
      stopReason?: string;
    } = { extracted, skipped };

    if (process.env.NODE_ENV !== "production") {
      responseBody.stopReason = response.stop_reason ?? undefined;
    }

    return NextResponse.json(responseBody);
  });
}
