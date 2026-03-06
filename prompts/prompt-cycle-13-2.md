# Cycle 13 — Prompt 2: AI Listing Copy Tools
## Description Generator · Title Optimizer · Quality Scorer
## Metal Gear · Industrial Equipment Marketplace

---

## Context

You are continuing development of Metal Gear. Prompt 13-1 built conversational search. This prompt adds three AI-powered tools that help sellers create better listings: description generator, title optimizer, and a listing quality scorer. All use the Anthropic SDK (`src/lib/anthropic.ts`).

---

## Goal

Remove the biggest friction point in listing creation — writing copy — and raise overall listing quality across the platform by giving sellers AI assistance at the point of entry.

---

## Deliverables

### 1. API Route — `src/app/api/listings/ai-copy/route.ts`

Single route, three actions via `action` param:

**Request (POST):**
```typescript
{
  action: 'generate_description' | 'optimize_title' | 'score_quality';
  listing: {
    title?: string;
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    year?: number;
    condition?: string;
    tier1?: string;
    tier2?: string;
    subcategory?: string;
    specs?: Record<string, string>;
    description?: string;       // existing description (for scoring)
    photoCount?: number;        // for quality scoring
    hasVideo?: boolean;
    price?: number;
    location?: string;
  }
}
```

**Response:**
```typescript
{
  // generate_description
  description?: string;          // 150-300 word professional listing description
  descriptionBullets?: string[]; // 4-6 key selling points as bullets

  // optimize_title
  optimizedTitle?: string;       // SEO-optimized title, max 80 chars
  titleAlternatives?: string[];  // 2 additional title options
  titleIssues?: string[];        // what was wrong with original title

  // score_quality
  score?: number;                // 0-100
  grade?: 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown?: {
    photos: { score: number; max: number; feedback: string };
    description: { score: number; max: number; feedback: string };
    specs: { score: number; max: number; feedback: string };
    title: { score: number; max: number; feedback: string };
    pricing: { score: number; max: number; feedback: string };
  };
  topImprovements?: string[];    // ordered list: do these first
  estimatedReachMultiplier?: number; // e.g. 2.4x more buyers vs current state
}
```

**Claude prompts:**

*Description generator:*
```
You are an industrial equipment listing copywriter specializing in the Houston, TX 
B2B marketplace. Write professional, accurate listing descriptions for heavy machinery.

Given the equipment details, write:
1. A 150-300 word description covering: what it is, key specs, condition, common 
   applications in oil & gas / petrochemical / manufacturing, and a call to action
2. 4-6 bullet points of the most important selling points

Tone: direct, technical, professional — buyers are engineers and operations managers.
Never make up specs not provided. Never use superlatives like "amazing" or "best."
Return ONLY valid JSON matching the schema. No markdown.
```

*Title optimizer:*
```
You are an industrial equipment SEO specialist. Optimize listing titles for 
discoverability in a B2B marketplace.

A great title format: [Manufacturer] [Model] [Equipment Type] — [Key Spec], [Year], [Condition]
Example: "Alfa Laval LYNX 300 Decanter Centrifuge — 75HP, 2019, Excellent"

Rules:
- Max 80 characters
- Lead with manufacturer if well-known
- Include the most searched spec (HP, capacity, size, etc.)
- Include year and condition if known
- Never truncate model numbers
- Return ONLY valid JSON with optimizedTitle, titleAlternatives (array of 2), 
  and titleIssues (array of strings describing problems with original)
```

*Quality scorer:*
```
You are a marketplace quality analyst. Score this industrial equipment listing 
from 0-100 based on how likely it is to attract serious buyers.

Scoring weights:
- Photos: 30 points (0 photos = 0, 1-2 = 10, 3-4 = 20, 5+ = 30)
- Description: 25 points (missing = 0, generic = 10, detailed = 20, expert = 25)
- Specs/technical details: 20 points
- Title quality: 15 points
- Pricing (present and reasonable): 10 points

Return ONLY valid JSON with: score (0-100), grade (A/B/C/D/F), breakdown object 
with score/max/feedback per category, topImprovements array (ordered), and 
estimatedReachMultiplier (float — how many more buyers vs a score of 0).
```

### 2. Listing Description Generator UI

**Placement:** In the listing creation form, Step 2 (description step), add an AI panel:

```
┌─────────────────────────────────────────────────────────┐
│  ✨ Generate description with AI                        │
│                                                         │
│  Based on: Alfa Laval LYNX 300, 2019, Excellent        │
│                                                         │
│  [Generate Description]                                 │
│                                                         │
│  ─ or type your own description below ──────────────── │
└─────────────────────────────────────────────────────────┘
```

After generation, show the result in a review panel:
```
┌─────────────────────────────────────────────────────────┐
│  ✨ AI-Generated Description                            │
│                                                         │
│  [Generated text shown here — editable textarea]        │
│                                                         │
│  Key selling points:                                    │
│  • 75HP direct drive motor, low maintenance             │
│  • Clean bowl with no visible wear                     │
│  • Suitable for oily water separation, sludge dewatering│
│                                                         │
│  [Use This ✓]  [Regenerate ↺]  [Edit before using]     │
└─────────────────────────────────────────────────────────┘
```

- "Use This" → populates the description textarea, dismisses the panel
- "Regenerate" → fires another Claude call (different temperature via API param)
- "Edit before using" → copies into textarea and focuses it for editing

Track usage: `ai_assist_used = true` when description is AI-generated

### 3. Title Optimizer UI

**Placement:** In the listing creation form, Step 1 (title field), add an inline trigger:

```
┌─────────────────────────────────────────────────────────┐
│  Title                                                  │
│  [Centrifuge for sale                           ] [✨ Optimize]
│                                                         │
│  After clicking Optimize:                               │
│  ─────────────────────────────────────────────────────  │
│  ⚠️ Issues: Too vague, missing manufacturer and model   │
│                                                         │
│  Suggested:                                             │
│  ● Alfa Laval LYNX 300 Decanter Centrifuge — 75HP, 2019 │
│  ○ LYNX 300 Decanter Centrifuge, Excellent, 2019        │
│  ○ Alfa Laval Decanter Centrifuge 75HP — Used, Houston  │
│                                                         │
│  [Apply Selected ✓]  [Keep Original]                   │
└─────────────────────────────────────────────────────────┘
```

- Radio select between the 3 title options
- Issues shown in amber warning style
- Only available if title field has content AND at least manufacturer or model is filled

### 4. Listing Quality Score Widget

**Location 1 — Listing creation form (final review step):**

Show before the user publishes:
```
┌─────────────────────────────────────────────────────────┐
│  📊 Listing Quality Score                               │
│                                                         │
│  ████████████████░░░░  72 / 100  Grade: B              │
│                                                         │
│  Photos      ████████████  20/30  ✅ Good              │
│  Description ████████████  20/25  ✅ Good              │
│  Specs       ████░░░░░░░░   8/20  ⚠️ Add more specs   │
│  Title       ████████████  15/15  ✅ Perfect           │
│  Pricing     ████████░░░░   9/10  ✅ Good              │
│                                                         │
│  Top improvements:                                      │
│  1. Add HP, RPM, and voltage specs (+8 pts)            │
│  2. Upload 2 more photos (+10 pts)                     │
│                                                         │
│  📈 Complete these to reach 2.3× more buyers           │
│                                                         │
│  [Improve Now]  [Publish Anyway →]                     │
└─────────────────────────────────────────────────────────┘
```

- "Improve Now" scrolls back to the weakest section
- Score updates in real-time as user fills fields (debounced — recalculate every 5 seconds of inactivity)
- Store `listing_quality_score` integer on the listings table

**Location 2 — Existing listing management page:**

Add a quality score chip to each listing row: `Score: 72 B`. Clicking opens the score breakdown in a drawer with improvement suggestions.

```sql
ALTER TABLE listings ADD COLUMN IF NOT EXISTS listing_quality_score integer;
```

### 5. Admin Analytics Integration

In the admin Analytics panel (built in Cycle 12), add a "Listing Quality" section:
- Average quality score across all active listings
- Distribution histogram: how many listings at each grade (A/B/C/D/F)
- Score over time: is average quality improving as AI tools are adopted?
- "AI-assisted listings" average score vs "manual listings" average score — shows AI ROI

---

## Performance Notes
- Description generation: ~8–12 seconds — show streaming text if possible using Anthropic streaming API
  - Use `anthropic.messages.stream()` and stream response to client via `ReadableStream`
  - This makes the wait feel much shorter — text appears word by word
- Title optimization: ~3–5 seconds — standard response, no streaming needed
- Quality scoring: ~4–6 seconds — standard response

**Streaming implementation pattern:**
```typescript
// In the API route for description generation:
const stream = anthropic.messages.stream({ model: 'claude-sonnet-4-20250514', ... });

return new Response(
  new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta') {
          controller.enqueue(new TextEncoder().encode(chunk.delta.text));
        }
      }
      controller.close();
    }
  }),
  { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
);
```

---

## Commit & Deploy
- Commit: `feat: AI listing copy tools — description generator, title optimizer, quality scorer`
- Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
- Push + Vercel deploy

---

## Next Prompt
Prompt 14-1 builds AI pricing intelligence — market-based price suggestions and the offer negotiation assistant.
