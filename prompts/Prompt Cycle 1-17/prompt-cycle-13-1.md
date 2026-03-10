# Cycle 13 — Prompt 1: Conversational AI Search
## Metal Gear · Industrial Equipment Marketplace

---

## Context

You are continuing development of Metal Gear, a Next.js 15 / TypeScript / Tailwind v4 / Supabase / Vercel industrial equipment marketplace. Review `CLAUDE.md` and `CHANGELOG.md` before starting. The Anthropic SDK is installed at `src/lib/anthropic.ts`. The 3-tier taxonomy is in `src/lib/constants/equipment-taxonomy.ts`.

---

## Goal

Replace the current keyword search bar with an AI-powered conversational search that lets industrial buyers describe what they need in plain English and get back structured, filtered results — without touching a single dropdown.

---

## Deliverables

### 1. API Route — `src/app/api/search/ai/route.ts`

**Request (POST):**
```typescript
{
  query: string;           // Natural language input
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  locationContext?: { lat: number; lng: number; city: string };
}
```

**Response:**
```typescript
{
  intent: 'search' | 'clarify' | 'recommend' | 'no_results_suggestion';
  filters: {
    tier1?: string;
    tier2?: string;
    subcategories?: string[];
    manufacturer?: string;
    minPrice?: number;
    maxPrice?: number;
    condition?: string[];
    radiusMiles?: number;
    keywords?: string;       // residual terms for FTS
  };
  clarifyingQuestion?: string;   // when intent = 'clarify'
  explanation: string;           // human-readable "Here's what I'm searching for..."
  suggestions?: string[];        // when intent = 'no_results_suggestion'
  rawResponse: string;
}
```

**Claude system prompt:**
```
You are an industrial equipment search specialist for Metal Gear, a marketplace 
serving oil & gas, petrochemical, mining, manufacturing, and CNC machining industries 
in the Houston, TX area and beyond.

Your job: translate a buyer's natural language query into structured search filters 
that map to our equipment taxonomy and database schema.

Equipment taxonomy (inject full taxonomy JSON here at runtime).

Rules:
- Always try to extract filters even from vague queries
- If the query is too vague to generate useful filters (e.g., "something for my plant"), 
  ask ONE targeted clarifying question
- If the buyer describes a problem (e.g., "my gearbox overheats"), infer the equipment 
  type they need and explain your reasoning
- Never ask more than one clarifying question per turn
- Return ONLY valid JSON matching the response schema — no markdown fences, no preamble

Return intent = 'clarify' only if you cannot extract at least one useful filter.
Return intent = 'no_results_suggestion' if the query is very niche and you predict 
zero matches — suggest related subcategories instead.
```

**Multi-turn support:**
- Pass `conversationHistory` into Claude messages array so the AI remembers context
- E.g., "Show me cheaper ones" works after "3-phase centrifuges under $50k"

**After filters are extracted:**
- Run the actual Supabase listing query using extracted filters (reuse existing search server action, pass filters programmatically)
- Return both the AI response object AND the matching listings array in the API response

### 2. Conversational Search UI Component — `src/components/search/ConversationalSearch.tsx`

**Layout:**
```
┌──────────────────────────────────────────────────────────┐
│  🔍  Describe what you need...                           │
│  "3-phase decanter centrifuge for oily sludge, <$40k"   │
│                                                    [→]   │
├──────────────────────────────────────────────────────────┤
│  💬  Searching for: Decanter centrifuges, 3-phase,      │
│      max $40,000 — showing 12 results                   │
│                                                         │
│  Active filters: [Process Equipment ×] [$40k max ×]    │
│  [Clear all]                          [Refine search]   │
└──────────────────────────────────────────────────────────┘
```

**Conversation thread (shows above search bar when multi-turn):**
```
You: Show me something cheaper
AI:  Got it — filtering under $25,000. Found 4 results.

You: What about used only?
AI:  Added condition filter: Used. 3 results remaining.
```

**Behavior:**
- Single text input, full-width — replaces existing search bar on the browse/search page
- `Shift+Enter` for newline, `Enter` to submit
- Shows spinner while Claude processes (typically 2–4 seconds)
- AI explanation text appears below the input in `#3A8FD4` steel blue italic
- Filter chips appear showing what was extracted — each chip has an × to remove
- Removing a chip re-runs the search without that filter
- "Refine search" button: opens a text input pre-filled with the previous query for editing
- Falls back to standard keyword search if the AI route fails (catch → use query string directly)
- Store conversation history in component state (not persisted — fresh per session)

**Example queries to handle well (test these manually):**
- `"centrifuge for oily water separation, Houston area, under 50k"`
- `"my gearbox is overheating at high RPM, need replacement"`
- `"decanter, Alfa Laval or Andritz, good condition, 3 phase"`
- `"ribbon blender for food grade application"` — should suggest food-adjacent subcategories
- `"something for my refinery"` — should trigger clarifying question

### 3. Integration into Browse/Search Page

- Replace the existing search bar on `/search` (or wherever the main browse page is) with `<ConversationalSearch />`
- Keep the existing filter sidebar functional — filters set by AI or by the sidebar should stay in sync via shared state / URL params
- When AI sets filters, update the URL query params so the page is shareable/bookmarkable
- Add a small "✨ AI Search" badge near the input to signal the capability

### 4. Search History Enhancement

Log AI search queries separately:
```sql
ALTER TABLE saved_searches
  ADD COLUMN IF NOT EXISTS ai_query text,      -- the original natural language query
  ADD COLUMN IF NOT EXISTS ai_filters jsonb,   -- the extracted filters
  ADD COLUMN IF NOT EXISTS is_ai_search boolean DEFAULT false;
```

When user clicks "Save this search" after an AI search, save both the natural language query and the extracted filters so it can be re-run later.

### 5. "Describe Your Problem" Entry Point

Add a secondary entry point on the dashboard and homepage hero:

```
┌─────────────────────────────────────────────────────┐
│  🔧 Describe your equipment problem                 │
│                                                     │
│  "My centrifuge bowl is vibrating under load..."    │
│                                          [Diagnose →]│
└─────────────────────────────────────────────────────┘
```

This uses the same API route but with a different system prompt variant that first identifies the likely equipment type needed, then flows into search results. Pass `intent_hint: 'problem'` in the request body to trigger this mode.

---

## Performance

- Cache Claude responses for identical queries (same query string) for 1 hour using `unstable_cache` — avoids duplicate API calls for common searches
- Debounce the input: don't fire until 800ms after user stops typing (auto-search mode, optional — make it opt-in with a toggle "Search as I type")
- Set `maxDuration = 30` on the API route

---

## Tests

- Unit test: filter extraction from 5 sample queries (mock Claude client)
- Unit test: multi-turn conversation appends history correctly
- Unit test: fallback behavior on Claude API failure

---

## Commit & Deploy
- Commit: `feat: conversational AI search with natural language to taxonomy filter mapping`
- Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
- Push + Vercel deploy

---

## Next Prompt
Prompt 13-2 adds AI listing copy tools: description generator, title optimizer, and quality scorer.
