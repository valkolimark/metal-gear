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

// Build a compact taxonomy string for Claude context
function buildTaxonomyContext(): string {
  const lines: string[] = [];
  for (const bucket of EQUIPMENT_TAXONOMY) {
    lines.push(`## ${bucket.label} (id: ${bucket.id})`);
    for (const group of bucket.groups) {
      lines.push(`  ### ${group.label} (id: ${group.id})`);
      for (const sub of group.subcategories) {
        lines.push(`    - ${sub.label} (id: ${sub.id})`);
      }
    }
  }
  return lines.join("\n");
}

function stripMarkdownFences(text: string): string {
  let cleaned = text.trim();
  // Remove ```json ... ``` or ``` ... ```
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  return cleaned.trim();
}

async function analyzeWideShot(
  base64Image: string,
  mimeType: string,
  taxonomyContext: string
): Promise<{ taxonomy: TaxonomyResult; listing: Partial<ListingResult>; fraud: FraudResult; raw: string }> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
              data: base64Image,
            },
          },
          {
            type: "text",
            text: `You are an industrial equipment identification specialist for Metal Gear, a Houston TX industrial equipment marketplace.

Analyze this equipment photo and:
1. Identify the equipment type with high specificity
2. Map it to the best matching subcategory from our taxonomy below
3. Estimate the equipment condition from the photo
4. Suggest a listing title and description
5. Assess whether this image appears to be AI-generated, stock photography, or a screenshot of another website's listing

EQUIPMENT TAXONOMY:
${taxonomyContext}

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "taxonomy": {
    "tier1": "tier1_id from taxonomy",
    "tier2": "tier2_id from taxonomy",
    "subcategory": "subcategory_id from taxonomy",
    "confidence": "high" | "medium" | "low",
    "alternatives": [{"tier1": "...", "tier2": "...", "subcategory": "..."}]
  },
  "listing": {
    "title": "suggested listing title",
    "manufacturer": "if identifiable from photo",
    "model": "if identifiable from photo",
    "year": null,
    "condition": "excellent" | "good" | "fair" | "poor",
    "suggestedDescription": "2-3 sentence description for the listing"
  },
  "fraud": {
    "flagged": false,
    "reason": null
  }
}

If you cannot identify the equipment, set confidence to "low" and provide your best guess.
For fraud, set flagged to true ONLY if the image shows clear signs of being AI-generated, stock photography, or a screenshot of another listing site.`,
          },
        ],
      },
    ],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = JSON.parse(stripMarkdownFences(raw));

  return {
    taxonomy: {
      tier1: parsed.taxonomy?.tier1,
      tier2: parsed.taxonomy?.tier2,
      subcategory: parsed.taxonomy?.subcategory,
      confidence: parsed.taxonomy?.confidence || "low",
      alternatives: parsed.taxonomy?.alternatives,
    },
    listing: {
      title: parsed.listing?.title,
      manufacturer: parsed.listing?.manufacturer,
      model: parsed.listing?.model,
      year: parsed.listing?.year,
      condition: parsed.listing?.condition,
      suggestedDescription: parsed.listing?.suggestedDescription,
    },
    fraud: {
      flagged: parsed.fraud?.flagged || false,
      reason: parsed.fraud?.reason || undefined,
    },
    raw,
  };
}

async function analyzeNameplate(
  base64Image: string,
  mimeType: string
): Promise<{ listing: Partial<ListingResult>; raw: string }> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
              data: base64Image,
            },
          },
          {
            type: "text",
            text: `You are an industrial equipment nameplate/data-plate OCR specialist. Extract every readable field from this data plate image.

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "manufacturer": "extracted manufacturer name",
  "model": "extracted model number",
  "serialNumber": "extracted serial number",
  "year": 2020,
  "specs": {
    "horsepower": "value with unit",
    "rpm": "value",
    "voltage": "value with unit",
    "amperage": "value with unit",
    "phase": "value",
    "frameSize": "value",
    "capacity": "value with unit",
    "weight": "value with unit",
    "certifications": "comma separated list",
    "country": "country of manufacture"
  }
}

Include ONLY fields you can actually read from the nameplate. For the specs object, include any additional key-value pairs visible on the plate that aren't in the template above. Omit fields you cannot read — do not guess.`,
          },
        ],
      },
    ],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = JSON.parse(stripMarkdownFences(raw));

  return {
    listing: {
      manufacturer: parsed.manufacturer,
      model: parsed.model,
      serialNumber: parsed.serialNumber,
      year: parsed.year ? Number(parsed.year) : undefined,
      specs: parsed.specs || {},
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
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: AnalyzeImageRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { wideShot, nameplateShot, mimeType = "image/jpeg" } = body;

  if (!wideShot && !nameplateShot) {
    return NextResponse.json(
      { error: "At least one image (wideShot or nameplateShot) is required" },
      { status: 400 }
    );
  }

  const taxonomyContext = buildTaxonomyContext();

  try {
    // Run both analyses in parallel when both images are provided
    const [wideShotResult, nameplateResult] = await Promise.all([
      wideShot
        ? analyzeWideShot(wideShot, mimeType, taxonomyContext).catch((err) => {
            Sentry.captureException(err, {
              extra: { mimeType, shot: "wideShot" },
            });
            return null;
          })
        : Promise.resolve(null),
      nameplateShot
        ? analyzeNameplate(nameplateShot, mimeType).catch((err) => {
            Sentry.captureException(err, {
              extra: { mimeType, shot: "nameplateShot" },
            });
            return null;
          })
        : Promise.resolve(null),
    ]);

    // Merge results — nameplate data takes priority for overlapping fields
    const result: AIAnalysisResult = {
      taxonomy: wideShotResult?.taxonomy || {
        confidence: "low" as const,
      },
      listing: {
        title: wideShotResult?.listing.title,
        manufacturer:
          nameplateResult?.listing.manufacturer || wideShotResult?.listing.manufacturer,
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
        wideShotResult?.raw && `--- Wide Shot Analysis ---\n${wideShotResult.raw}`,
        nameplateResult?.raw && `--- Nameplate Analysis ---\n${nameplateResult.raw}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    };

    return NextResponse.json(result);
  } catch (err) {
    Sentry.captureException(err, {
      extra: { mimeType, hasWideShot: !!wideShot, hasNameplate: !!nameplateShot },
    });
    return NextResponse.json(
      { error: "Failed to analyze image. Please try again." },
      { status: 500 }
    );
  }
}
