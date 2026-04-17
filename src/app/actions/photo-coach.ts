"use server"

import Anthropic from "@anthropic-ai/sdk"
import { anthropic } from "@/lib/anthropic"
import type { PhotoCoachOutput } from "@/lib/snap-list/types"

const MODEL = "claude-sonnet-4-20250514"

export interface PhotoCoachInput {
  equipmentType: string | null
  manufacturer: string | null
  photoCount: number
  hasNameplate: boolean
  specs: Record<string, string | number>
}

const SYSTEM_PROMPT = `You are a marketplace merchandising expert. Buyers of industrial equipment need specific visual evidence to decide whether to inquire. Given a piece of equipment and the photos the seller has already uploaded, name the 1–3 additional shots that would most increase buyer confidence and response rate.

Return ONLY valid JSON:
{
  "currentQualityScore": 0-100,
  "suggestions": [
    { "id": "short-id", "title": "Shot name", "description": "Why it matters — one sentence.", "priority": "high|medium|low", "projectedQualityLift": 0-30 }
  ],
  "projectedWithAllSuggestions": 0-100
}`

/**
 * Claude-backed photo coach. Returns 1–3 ranked suggestions with projected
 * quality lift. Fails gracefully (returns a null-ish result) on error so the
 * UI can skip the coach card.
 */
export async function generatePhotoCoaching(
  input: PhotoCoachInput,
): Promise<PhotoCoachOutput | null> {
  const equipment = [input.manufacturer, input.equipmentType].filter(Boolean).join(" ") || "industrial equipment"
  const userPrompt = [
    `Equipment: ${equipment}`,
    `Photos already uploaded: ${input.photoCount}`,
    `Nameplate captured: ${input.hasNameplate ? "yes" : "no"}`,
    `Known specs: ${JSON.stringify(input.specs) || "(none)"}`,
    "",
    "Return the JSON now.",
  ].join("\n")

  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    })
    const raw = res.content
      .filter((c): c is Anthropic.TextBlock => c.type === "text")
      .map((c) => c.text)
      .join("\n")

    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    const body = fenced ? fenced[1] : raw
    const firstBrace = body.indexOf("{")
    const lastBrace = body.lastIndexOf("}")
    if (firstBrace === -1 || lastBrace === -1) return null
    const parsed = JSON.parse(body.slice(firstBrace, lastBrace + 1)) as PhotoCoachOutput

    // Light validation.
    if (!Array.isArray(parsed.suggestions)) return null
    parsed.suggestions = parsed.suggestions.slice(0, 3).map((s, i) => ({
      id: s.id ?? `coach-${i}`,
      title: s.title ?? "Additional shot",
      description: s.description ?? "",
      priority: (["high", "medium", "low"] as const).includes(s.priority)
        ? s.priority
        : "medium",
      projectedQualityLift: clampInt(s.projectedQualityLift, 0, 30),
    }))
    return {
      currentQualityScore: clampInt(parsed.currentQualityScore, 0, 100),
      suggestions: parsed.suggestions,
      projectedWithAllSuggestions: clampInt(parsed.projectedWithAllSuggestions, 0, 100),
    }
  } catch (err) {
    console.error("[photo-coach] generation failed:", err)
    return null
  }
}

function clampInt(n: unknown, min: number, max: number): number {
  const v = typeof n === "number" ? Math.round(n) : min
  if (Number.isNaN(v)) return min
  return Math.max(min, Math.min(max, v))
}
