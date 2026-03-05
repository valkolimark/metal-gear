import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";
import { EQUIPMENT_TAXONOMY } from "@/lib/constants/equipment-taxonomy";
import * as Sentry from "@sentry/nextjs";
import type {
  AnalyzeImageRequest,
  AIAnalysisResult,
  TaxonomyResult,
  ListingResult,
  FraudResult,
} from "@/types/ai-analysis";

export const maxDuration = 60;

const VISION_MODEL = "claude-sonnet-4-20250514";

// Build a compact taxonomy string for Claude context
function buildTaxonomyContext(): string {
  const lines: string[] = [];
  for (const bucket of EQUIPMENT_TAXONOMY) {
    lines.push(`[${bucket.id}] ${bucket.label}`);
    for (const group of bucket.groups) {
      lines.push(`  [${group.id}] ${group.label}`);
      for (const sub of group.subcategories) {
        lines.push(`    [${sub.id}] ${sub.label}`);
      }
    }
  }
  return lines.join("\n");
}

function extractJSON(text: string): Record<string, unknown> {
  let cleaned = text.trim();

  // Strip markdown code fences
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "");
  }

  // Try parsing as-is first
  try {
    return JSON.parse(cleaned.trim());
  } catch {
    // Fallback: find the first { ... } block in the text
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error(`Could not extract JSON from response: ${cleaned.substring(0, 200)}`);
  }
}

async function analyzeWideShot(
  base64Image: string,
  mimeType: string,
  taxonomyContext: string
): Promise<{
  taxonomy: TaxonomyResult;
  listing: Partial<ListingResult>;
  fraud: FraudResult;
  raw: string;
}> {
  const response = await anthropic.messages.create({
    model: VISION_MODEL,
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType as
                | "image/jpeg"
                | "image/png"
                | "image/webp"
                | "image/gif",
              data: base64Image,
            },
          },
          {
            type: "text",
            text: `You are an expert industrial equipment appraiser. Identify this equipment and return a JSON object.

TASK:
1. Identify the equipment type, manufacturer, model if visible
2. Map it to the BEST matching subcategory from the taxonomy below (use the bracket IDs)
3. Estimate condition from visual appearance
4. Write a marketplace listing title and 2-sentence description
5. Check if this looks like a real photo (not AI-generated, not stock, not a screenshot)

TAXONOMY (use the [bracket_id] values in your response):
${taxonomyContext}

RESPOND WITH ONLY THIS JSON (no other text):
{
  "taxonomy": {
    "tier1": "bracket_id_of_tier1",
    "tier2": "bracket_id_of_tier2",
    "subcategory": "bracket_id_of_subcategory",
    "confidence": "high",
    "alternatives": []
  },
  "listing": {
    "title": "Brand Model - Short Description",
    "manufacturer": "Brand name or null",
    "model": "Model number or null",
    "year": null,
    "condition": "good",
    "suggestedDescription": "Two sentence description for marketplace listing."
  },
  "fraud": {
    "flagged": false,
    "reason": null
  }
}

IMPORTANT RULES:
- confidence should be "high" if you can clearly identify the equipment type, "medium" if somewhat uncertain, "low" only if truly unrecognizable
- Most clear photos of real equipment should be "high" confidence
- Always provide your best guess even if uncertain — fill in all fields
- For condition: "excellent"=like new, "good"=normal wear, "fair"=significant wear, "poor"=damaged
- Set fraud.flagged=true ONLY for obvious AI-generated images, stock photos, or screenshots of other websites`,
          },
        ],
      },
    ],
  });

  const raw =
    response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = extractJSON(raw);

  const taxonomy = parsed.taxonomy as Record<string, unknown> | undefined;
  const listing = parsed.listing as Record<string, unknown> | undefined;
  const fraud = parsed.fraud as Record<string, unknown> | undefined;

  return {
    taxonomy: {
      tier1: (taxonomy?.tier1 as string) || undefined,
      tier2: (taxonomy?.tier2 as string) || undefined,
      subcategory: (taxonomy?.subcategory as string) || undefined,
      confidence: ((taxonomy?.confidence as string) || "medium") as
        | "high"
        | "medium"
        | "low",
      alternatives: (taxonomy?.alternatives as TaxonomyResult["alternatives"]) || [],
    },
    listing: {
      title: (listing?.title as string) || undefined,
      manufacturer: (listing?.manufacturer as string) || undefined,
      model: (listing?.model as string) || undefined,
      year: listing?.year ? Number(listing.year) : undefined,
      condition: (listing?.condition as ListingResult["condition"]) || undefined,
      suggestedDescription: (listing?.suggestedDescription as string) || undefined,
    },
    fraud: {
      flagged: (fraud?.flagged as boolean) || false,
      reason: (fraud?.reason as string) || undefined,
    },
    raw,
  };
}

async function analyzeNameplate(
  base64Image: string,
  mimeType: string
): Promise<{ listing: Partial<ListingResult>; raw: string }> {
  const response = await anthropic.messages.create({
    model: VISION_MODEL,
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType as
                | "image/jpeg"
                | "image/png"
                | "image/webp"
                | "image/gif",
              data: base64Image,
            },
          },
          {
            type: "text",
            text: `You are an industrial equipment nameplate OCR specialist. Read every field from this data plate / nameplate image.

RESPOND WITH ONLY THIS JSON (no other text):
{
  "manufacturer": "name from plate",
  "model": "model number from plate",
  "serialNumber": "serial number from plate",
  "year": 2020,
  "specs": {
    "key": "value"
  }
}

RULES:
- Extract manufacturer, model, serialNumber, and year as top-level fields
- Put ALL other readable data into the "specs" object as key-value pairs
- Common spec keys: horsepower, rpm, voltage, amperage, phase, frameSize, capacity, weight, certifications, country
- Include any other visible specs not in that list
- If a field is not readable, omit it entirely — do not guess
- year should be a number, not a string`,
          },
        ],
      },
    ],
  });

  const raw =
    response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = extractJSON(raw);

  return {
    listing: {
      manufacturer: (parsed.manufacturer as string) || undefined,
      model: (parsed.model as string) || undefined,
      serialNumber: (parsed.serialNumber as string) || undefined,
      year: parsed.year ? Number(parsed.year) : undefined,
      specs: (parsed.specs as Record<string, string>) || {},
    },
    raw,
  };
}

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  let body: AnalyzeImageRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { wideShot, nameplateShot, mimeType = "image/jpeg" } = body;

  if (!wideShot && !nameplateShot) {
    return NextResponse.json(
      { error: "At least one image (wideShot or nameplateShot) is required" },
      { status: 400 }
    );
  }

  const taxonomyContext = buildTaxonomyContext();
  const errors: string[] = [];

  let wideShotResult: Awaited<ReturnType<typeof analyzeWideShot>> | null = null;
  let nameplateResult: Awaited<ReturnType<typeof analyzeNameplate>> | null =
    null;

  // Run analyses — DO NOT silently swallow errors
  try {
    if (wideShot) {
      wideShotResult = await analyzeWideShot(wideShot, mimeType, taxonomyContext);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Wide shot analysis failed: ${msg}`);
    Sentry.captureException(err, {
      extra: { mimeType, shot: "wideShot", errorMessage: msg },
    });
  }

  try {
    if (nameplateShot) {
      nameplateResult = await analyzeNameplate(nameplateShot, mimeType);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Nameplate analysis failed: ${msg}`);
    Sentry.captureException(err, {
      extra: { mimeType, shot: "nameplateShot", errorMessage: msg },
    });
  }

  // If BOTH failed, return 500 with error details
  if (!wideShotResult && !nameplateResult) {
    return NextResponse.json(
      {
        error: "Image analysis failed",
        details: errors,
      },
      { status: 500 }
    );
  }

  // Merge results — nameplate data takes priority for overlapping fields
  const result: AIAnalysisResult = {
    taxonomy: wideShotResult?.taxonomy || {
      confidence: "low" as const,
    },
    listing: {
      title: wideShotResult?.listing.title,
      manufacturer:
        nameplateResult?.listing.manufacturer ||
        wideShotResult?.listing.manufacturer,
      model: nameplateResult?.listing.model || wideShotResult?.listing.model,
      serialNumber: nameplateResult?.listing.serialNumber,
      year: nameplateResult?.listing.year || wideShotResult?.listing.year,
      condition: wideShotResult?.listing.condition,
      specs: {
        ...(nameplateResult?.listing.specs || {}),
      },
      suggestedDescription: wideShotResult?.listing.suggestedDescription,
    },
    fraud: wideShotResult?.fraud || { flagged: false },
    rawAnalysis: [
      wideShotResult?.raw &&
        `--- Wide Shot Analysis ---\n${wideShotResult.raw}`,
      nameplateResult?.raw &&
        `--- Nameplate Analysis ---\n${nameplateResult.raw}`,
      errors.length > 0 && `--- Errors ---\n${errors.join("\n")}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
  };

  return NextResponse.json(result);
}
