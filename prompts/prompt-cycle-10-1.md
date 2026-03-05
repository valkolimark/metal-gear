# Cycle 10 — Prompt 1: AI Image Recognition API
## Metal Gear · Industrial Equipment Marketplace

---

## Context

You are continuing development of Metal Gear, a Next.js 15 / TypeScript / Tailwind v4 / Supabase / Vercel industrial equipment marketplace. Review `CLAUDE.md` and `CHANGELOG.md` for full context. The app uses server actions with `createAdminClient()` for all DB operations. The 3-tier equipment taxonomy lives in `src/lib/constants/equipment-taxonomy.ts`.

---

## Goal

Build a `/api/listings/analyze-image` API route that accepts one or two base64-encoded images and uses the Anthropic Claude Vision API (claude-sonnet-4-20250514) to:

1. **Identify the equipment** from a wide-shot photo → map to the 3-tier taxonomy
2. **Extract nameplate/data-plate data** from a close-up photo → return structured listing fields

This is a server-side only route. No client-side Anthropic calls.

---

## Deliverables

### 1. Environment Variable
Add `ANTHROPIC_API_KEY` to Vercel env vars via REST API (ask me for the key value).

### 2. API Route — `src/app/api/listings/analyze-image/route.ts`

**Request body (POST):**
```typescript
{
  wideShot?: string;       // base64 image, equipment wide shot
  nameplateShot?: string;  // base64 image, nameplate close-up
  mimeType?: string;       // "image/jpeg" | "image/png" | "image/webp" (default: "image/jpeg")
}
```

**Response body:**
```typescript
{
  taxonomy: {
    tier1?: string;
    tier2?: string;
    subcategory?: string;
    confidence: "high" | "medium" | "low";
    alternatives?: Array<{ tier1: string; tier2: string; subcategory: string }>;
  };
  listing: {
    title?: string;
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    year?: number;
    condition?: "excellent" | "good" | "fair" | "poor";
    specs: Record<string, string>; // HP, RPM, voltage, capacity, etc.
    suggestedDescription?: string;
  };
  fraud: {
    flagged: boolean;
    reason?: string; // e.g. "Image appears AI-generated based on visual artifacts"
  };
  rawAnalysis: string; // Claude's full text response for debugging
}
```

**Implementation details:**

- Use two separate Claude Vision calls when both images are provided, then merge results
- **Wide shot prompt:** Identify equipment type with high specificity. Map to one of the known taxonomy subcategories (inject the full taxonomy as context). Return JSON only.
- **Nameplate prompt:** You are an industrial equipment nameplate OCR specialist. Extract every readable field from this data plate image. Return JSON only. Fields: manufacturer, model, serialNumber, year, horsepower, rpm, voltage, amperage, phase, frameSize, capacity, weight, certifications, country, and any other visible specs as key-value pairs in a `specs` object.
- **Fraud detection:** In the wide-shot prompt, also ask Claude to assess whether the image appears to be AI-generated, stock photography, or a screenshot of another website's listing. Return `flagged: true` if any of these are detected.
- Parse Claude's JSON response safely — strip markdown fences if present before `JSON.parse()`
- Return HTTP 400 if neither image is provided
- Return HTTP 500 with `{ error: string }` on Claude API failure
- Set `export const maxDuration = 60` (Vercel function timeout)
- Rate limit: check user is authenticated via Supabase session cookie before processing

### 3. Anthropic SDK Installation
```bash
npm install @anthropic-ai/sdk
```

Create `src/lib/anthropic.ts`:
```typescript
import Anthropic from "@anthropic-ai/sdk";
export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
```

### 4. Type Definitions
Add `src/types/ai-analysis.ts` exporting all request/response types above.

### 5. Error Logging
Log all Claude API errors to Sentry with the image mime type and which shot failed.

---

## Database Change
Add to `listings` table:
```sql
ALTER TABLE listings
  ADD COLUMN ai_analyzed boolean DEFAULT false,
  ADD COLUMN ai_fraud_flagged boolean DEFAULT false,
  ADD COLUMN ai_fraud_reason text;
```

Run via Supabase Management API (ask me for the token).

---

## Tests
Add `src/test/analyze-image.test.ts` with:
- Unit test: response shape validation with mocked Anthropic client
- Unit test: handles missing both images (400)
- Unit test: strips markdown fences from JSON response correctly

---

## Commit & Deploy
- Commit message: `feat: Claude Vision API route for equipment image analysis`
- Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
- Push to main and trigger Vercel deploy via curl

---

## Next Prompt
Prompt 10-2 will wire this API route into the listing creation UI with mobile camera support.
