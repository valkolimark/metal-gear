import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";
import { EQUIPMENT_TAXONOMY } from "@/lib/constants/equipment-taxonomy";
import * as Sentry from "@sentry/nextjs";
import {
  EQUIPMENT_ANALYSIS_SYSTEM_PROMPT,
  MULTI_IMAGE_ANALYSIS_PROMPT,
  SINGLE_IMAGE_ANALYSIS_PROMPT,
  buildClarificationPrompt,
} from "@/lib/ai/equipment-prompts";
import type {
  AnalyzeImageRequest,
  AIAnalysisResult,
  FieldConfidenceScores,
} from "@/types/ai-analysis";
import type { MessageParam, ImageBlockParam, TextBlockParam } from "@anthropic-ai/sdk/resources/messages";

export const maxDuration = 60;

const VISION_MODEL = "claude-sonnet-4-20250514";
const LOW_CONFIDENCE_THRESHOLD = 0.5;
const REPROMPT_THRESHOLD = 0.55;

type ImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

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

// Extract confidence scores from the structured response
function extractConfidenceScores(parsed: Record<string, unknown>): FieldConfidenceScores {
  const getConf = (field: unknown): number => {
    if (field && typeof field === "object" && "confidence" in (field as Record<string, unknown>)) {
      return Number((field as Record<string, unknown>).confidence) || 0;
    }
    return 0.5; // default mid confidence for legacy responses
  };

  return {
    equipment_type: getConf(parsed.equipment_type),
    manufacturer: getConf(parsed.manufacturer),
    model: getConf(parsed.model),
    serial_number: getConf(parsed.serial_number),
    year: getConf(parsed.year),
    condition: getConf(parsed.condition_estimate),
    taxonomy: typeof parsed.taxonomy === "object" && parsed.taxonomy
      ? Number((parsed.taxonomy as Record<string, unknown>).confidence) || 0.5
      : 0.5,
    title: getConf(parsed.suggested_title),
    fraud: typeof parsed.fraud_flags === "object" && parsed.fraud_flags
      ? Number((parsed.fraud_flags as Record<string, unknown>).confidence) || 0.5
      : 0.5,
  };
}

// Get value from confidence field
function getVal<T>(field: unknown, fallback: T): T {
  if (field && typeof field === "object" && "value" in (field as Record<string, unknown>)) {
    const v = (field as Record<string, unknown>).value;
    return (v as T) ?? fallback;
  }
  return (field as T) ?? fallback;
}

function getLowConfidenceFields(scores: FieldConfidenceScores): string[] {
  const fields: string[] = [];
  const criticalFields: Array<keyof FieldConfidenceScores> = [
    "equipment_type", "manufacturer", "model", "serial_number", "year", "taxonomy",
  ];
  for (const field of criticalFields) {
    if (scores[field] < LOW_CONFIDENCE_THRESHOLD) {
      fields.push(field);
    }
  }
  return fields;
}

function computeOverallConfidence(scores: FieldConfidenceScores): number {
  const criticalFields: Array<keyof FieldConfidenceScores> = [
    "equipment_type", "manufacturer", "model", "taxonomy", "title",
  ];
  const sum = criticalFields.reduce((acc, f) => acc + scores[f], 0);
  return Math.round((sum / criticalFields.length) * 100) / 100;
}

// Convert structured Claude response to AIAnalysisResult
function parseStructuredResponse(
  parsed: Record<string, unknown>,
  rawText: string,
  analysisMode: "single_image" | "multi_image"
): AIAnalysisResult {
  const scores = extractConfidenceScores(parsed);
  const overallConfidence = computeOverallConfidence(scores);
  const lowConfidenceFields = getLowConfidenceFields(scores);

  const taxonomy = parsed.taxonomy as Record<string, unknown> | undefined;
  const fraudFlags = parsed.fraud_flags as Record<string, unknown> | undefined;
  const keySpecs = getVal<Record<string, string>>(parsed.key_specs, {});

  // Map numeric taxonomy confidence to string
  const taxConfNum = taxonomy ? Number(taxonomy.confidence) || 0.5 : 0.5;
  const taxConfStr: "high" | "medium" | "low" =
    taxConfNum >= 0.8 ? "high" : taxConfNum >= 0.5 ? "medium" : "low";

  const conditionMap: Record<string, "excellent" | "good" | "fair" | "poor"> = {
    excellent: "excellent", good: "good", fair: "fair", poor: "poor",
    A: "excellent", B: "good", C: "fair", D: "poor", F: "poor",
  };
  const rawCondition = getVal<string | null>(parsed.condition_estimate, null);
  const condition = rawCondition ? conditionMap[rawCondition] || undefined : undefined;

  return {
    taxonomy: {
      tier1: taxonomy?.tier1 as string | undefined,
      tier2: taxonomy?.tier2 as string | undefined,
      subcategory: taxonomy?.subcategory as string | undefined,
      confidence: taxConfStr,
      numericConfidence: taxConfNum,
      alternatives: [],
    },
    listing: {
      title: getVal<string | undefined>(parsed.suggested_title, undefined),
      manufacturer: getVal<string | null>(parsed.manufacturer, null) || undefined,
      model: getVal<string | null>(parsed.model, null) || undefined,
      serialNumber: getVal<string | null>(parsed.serial_number, null) || undefined,
      year: getVal<number | null>(parsed.year, null) || undefined,
      condition,
      specs: keySpecs,
      suggestedDescription: (parsed.suggested_description as string) || undefined,
    },
    fraud: {
      flagged: fraudFlags?.is_suspicious === true,
      reason: Array.isArray(fraudFlags?.reasons) && (fraudFlags.reasons as string[]).length > 0
        ? (fraudFlags.reasons as string[]).join("; ")
        : undefined,
      confidence: Number(fraudFlags?.confidence) || 0.5,
    },
    rawAnalysis: rawText,
    confidenceScores: scores,
    overallConfidence,
    lowConfidenceFields,
    analysisMode,
    wasReprompted: false,
  };
}

// Merge re-prompted result fields with higher confidence into original
function mergeAnalysisResults(
  original: AIAnalysisResult,
  refined: Record<string, unknown>
): AIAnalysisResult {
  const result = { ...original };
  const scores = { ...original.confidenceScores! };

  const fieldMappings: Array<{
    parsedKey: string
    scoreKey: keyof FieldConfidenceScores
    apply: (val: unknown, conf: number) => void
  }> = [
    {
      parsedKey: "equipment_type",
      scoreKey: "equipment_type",
      apply: () => { /* equipment_type is used for taxonomy, no direct listing field */ },
    },
    {
      parsedKey: "manufacturer",
      scoreKey: "manufacturer",
      apply: (val) => { result.listing = { ...result.listing, manufacturer: getVal<string | null>(val, null) || undefined }; },
    },
    {
      parsedKey: "model",
      scoreKey: "model",
      apply: (val) => { result.listing = { ...result.listing, model: getVal<string | null>(val, null) || undefined }; },
    },
    {
      parsedKey: "serial_number",
      scoreKey: "serial_number",
      apply: (val) => { result.listing = { ...result.listing, serialNumber: getVal<string | null>(val, null) || undefined }; },
    },
    {
      parsedKey: "year",
      scoreKey: "year",
      apply: (val) => { result.listing = { ...result.listing, year: getVal<number | null>(val, null) || undefined }; },
    },
  ];

  for (const mapping of fieldMappings) {
    const refinedField = refined[mapping.parsedKey];
    if (!refinedField) continue;
    const refinedConf = typeof refinedField === "object" && refinedField && "confidence" in (refinedField as Record<string, unknown>)
      ? Number((refinedField as Record<string, unknown>).confidence) || 0
      : 0;
    if (refinedConf > scores[mapping.scoreKey]) {
      scores[mapping.scoreKey] = refinedConf;
      mapping.apply(refinedField, refinedConf);
    }
  }

  // Merge taxonomy if present and higher confidence
  if (refined.taxonomy && typeof refined.taxonomy === "object") {
    const refinedTaxConf = Number((refined.taxonomy as Record<string, unknown>).confidence) || 0;
    if (refinedTaxConf > scores.taxonomy) {
      scores.taxonomy = refinedTaxConf;
      const rt = refined.taxonomy as Record<string, unknown>;
      result.taxonomy = {
        ...result.taxonomy,
        tier1: (rt.tier1 as string) || result.taxonomy.tier1,
        tier2: (rt.tier2 as string) || result.taxonomy.tier2,
        subcategory: (rt.subcategory as string) || result.taxonomy.subcategory,
        numericConfidence: refinedTaxConf,
        confidence: refinedTaxConf >= 0.8 ? "high" : refinedTaxConf >= 0.5 ? "medium" : "low",
      };
    }
  }

  result.confidenceScores = scores;
  result.overallConfidence = computeOverallConfidence(scores);
  result.lowConfidenceFields = getLowConfidenceFields(scores);
  result.wasReprompted = true;

  return result;
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

  const {
    wideShot,
    nameplateShot,
    nameplateImageBase64,
    mimeType = "image/jpeg",
    nameplateMimeType,
  } = body;

  // Validate base64 size — 15MB cap (~10MB image after base64 encoding)
  const MAX_BASE64_SIZE = 15_000_000;
  const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  if (wideShot && wideShot.length > MAX_BASE64_SIZE) {
    return NextResponse.json({ error: "Wide shot image too large (max 10MB)" }, { status: 400 });
  }
  if (nameplateShot && nameplateShot.length > MAX_BASE64_SIZE) {
    return NextResponse.json({ error: "Nameplate image too large (max 10MB)" }, { status: 400 });
  }
  if (nameplateImageBase64 && nameplateImageBase64.length > MAX_BASE64_SIZE) {
    return NextResponse.json({ error: "Nameplate image too large (max 10MB)" }, { status: 400 });
  }
  if (!validMimeTypes.includes(mimeType)) {
    return NextResponse.json({ error: "Invalid image MIME type" }, { status: 400 });
  }
  if (nameplateMimeType && !validMimeTypes.includes(nameplateMimeType)) {
    return NextResponse.json({ error: "Invalid nameplate MIME type" }, { status: 400 });
  }

  const resolvedNameplate = nameplateShot || nameplateImageBase64;

  if (!wideShot && !resolvedNameplate) {
    return NextResponse.json(
      { error: "At least one image (wideShot or nameplateShot) is required" },
      { status: 400 }
    );
  }

  const taxonomyContext = buildTaxonomyContext();
  const isMultiImage = !!(wideShot && resolvedNameplate);
  const analysisMode = isMultiImage ? "multi_image" as const : "single_image" as const;

  try {
    // Build message content based on single vs multi-image
    const imageContent: Array<TextBlockParam | ImageBlockParam> = [];

    if (isMultiImage) {
      imageContent.push({
        type: "text" as const,
        text: "Image 1 is a wide shot of the equipment. Image 2 is a close-up of the nameplate or data plate.",
      });
      imageContent.push({
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: mimeType as ImageMediaType,
          data: wideShot!,
        },
      });
      imageContent.push({
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: (nameplateMimeType || mimeType) as ImageMediaType,
          data: resolvedNameplate!,
        },
      });
      imageContent.push({
        type: "text" as const,
        text: `${MULTI_IMAGE_ANALYSIS_PROMPT}\n\nTAXONOMY (use the [bracket_id] values):\n${taxonomyContext}`,
      });
    } else {
      // Single image
      const imageData = wideShot || resolvedNameplate!;
      imageContent.push({
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: mimeType as ImageMediaType,
          data: imageData,
        },
      });
      imageContent.push({
        type: "text" as const,
        text: `${SINGLE_IMAGE_ANALYSIS_PROMPT}\n\nTAXONOMY (use the [bracket_id] values):\n${taxonomyContext}`,
      });
    }

    const messages: MessageParam[] = [{ role: "user", content: imageContent }];

    // First analysis call
    const response = await anthropic.messages.create({
      model: VISION_MODEL,
      max_tokens: 2048,
      system: EQUIPMENT_ANALYSIS_SYSTEM_PROMPT,
      messages,
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(rawText);
    let result = parseStructuredResponse(parsed, rawText, analysisMode);

    // Auto re-prompt if overall confidence is below threshold
    if (
      result.overallConfidence !== undefined &&
      result.overallConfidence < REPROMPT_THRESHOLD &&
      result.lowConfidenceFields &&
      result.lowConfidenceFields.length > 0
    ) {
      try {
        const clarificationPrompt = buildClarificationPrompt(result.lowConfidenceFields);
        const refinedResponse = await anthropic.messages.create({
          model: VISION_MODEL,
          max_tokens: 1024,
          system: EQUIPMENT_ANALYSIS_SYSTEM_PROMPT,
          messages: [
            ...messages,
            { role: "assistant", content: rawText },
            { role: "user", content: clarificationPrompt },
          ],
        });

        const refinedText = refinedResponse.content[0].type === "text" ? refinedResponse.content[0].text : "";
        const refinedParsed = extractJSON(refinedText);
        result = mergeAnalysisResults(result, refinedParsed);
        result.rawAnalysis += `\n\n--- Re-prompt Analysis ---\n${refinedText}`;
      } catch (repromptErr) {
        // Re-prompt failed — return original result, just log it
        Sentry.captureException(repromptErr, {
          extra: { phase: "reprompt", lowConfidenceFields: result.lowConfidenceFields },
        });
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    Sentry.captureException(err, {
      extra: { mimeType, analysisMode, errorMessage: msg },
    });
    return NextResponse.json(
      { error: "Image analysis failed", details: [msg] },
      { status: 500 }
    );
  }
}
