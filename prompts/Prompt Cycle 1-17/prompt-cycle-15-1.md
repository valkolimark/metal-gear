# Cycle 15 — Prompt 1: Smart Saved Search Alerts · Reputation Summarizer · Dispute Mediation
## Metal Gear · Industrial Equipment Marketplace

---

## Context

You are continuing development of Metal Gear. This prompt builds three AI features that operate in the background: intelligent saved search matching (sends alerts only when truly relevant), an AI reputation summarizer (replaces raw star ratings), and an AI dispute mediation assistant that helps admins resolve conflicts.

---

## Deliverables

### 1. Smart Saved Search Alert Engine — `src/app/api/cron/smart-search-alerts/route.ts`

**Problem with current alerts:** The existing cron sends alerts for any new listing that matches saved search filters exactly. This generates noise (low-relevance matches, wrong condition, poor listings).

**AI-powered alternative:** For each new listing, ask Claude: "Would this listing interest a buyer who saved a search for X?" Only send an alert if Claude says yes with high confidence.

**Implementation:**

```typescript
// Runs daily (replace existing saved-search-alerts cron)
// For each new listing posted in the last 24 hours:
//   For each saved search that overlaps with the listing's subcategory:
//     Ask Claude to score relevance (0-100)
//     If score >= 75: send alert with AI-generated explanation of why it matches
//     If score < 75: skip

interface SmartAlertRelevanceRequest {
  listing: {
    title: string;
    manufacturer?: string;
    model?: string;
    subcategory: string;
    condition: string;
    price: number;
    specs?: Record<string, string>;
    description?: string;
    location?: string;
  };
  savedSearch: {
    name: string;
    aiQuery?: string;        // natural language query if AI search was used
    filters: {
      tier2?: string;
      subcategory?: string;
      maxPrice?: number;
      condition?: string[];
      keywords?: string;
    };
    targetPrice?: number;    // user's target price alert
  };
}
```

**Claude prompt for relevance scoring:**
```
You are evaluating whether a new industrial equipment listing is relevant enough 
to notify a buyer who has saved a specific search.

Score relevance 0–100. Only score 75+ if the listing is genuinely a good match 
for what the buyer is looking for. Be conservative — we'd rather miss a marginal 
match than annoy the buyer with irrelevant notifications.

Return ONLY valid JSON: { score: number, explanation: string, shouldNotify: boolean }
The explanation should be 1 sentence max explaining WHY this listing matches.
```

**Alert email enhancement:**
When an alert IS sent, include Claude's explanation in the subject/body:
- Subject: `"Match found: Alfa Laval LYNX 300 matches your 'decanter centrifuge Houston' search"`
- Body includes: "Why this matches: Alfa Laval decanter, 75HP, listed in Houston at $21,000 — within your $25k target"

**Batch efficiently:** Process in batches of 20 listing × search pairs per Claude call using a structured multi-item prompt. Reduces API costs significantly.

**Track:** Log alert send/skip decisions to `saved_search_alert_log`:
```sql
CREATE TABLE saved_search_alert_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_search_id uuid REFERENCES saved_searches(id),
  listing_id uuid REFERENCES listings(id),
  ai_relevance_score integer,
  ai_explanation text,
  alert_sent boolean,
  skip_reason text,
  created_at timestamptz DEFAULT now()
);
```

### 2. AI Seller Reputation Summarizer

**Problem:** Raw star ratings (4.7/5) tell buyers nothing useful. Reviews say things like "great experience" which is noise.

**Solution:** Claude reads all reviews for a seller and generates a structured reputation summary.

**API Route — `src/app/api/users/[id]/reputation-summary/route.ts`:**

**Request:** GET (no body — user ID from URL param)

**Response:**
```typescript
{
  summary: string;           // 2-3 sentence plain English summary
  strengths: string[];       // top 3 verified strengths with evidence
  watchouts: string[];       // recurring concerns (if any) — honest, not harsh
  responseTime: string;      // "Typically responds within 2 hours"
  verifiedClaims: string[];  // "Ships as described (mentioned in 8 of 12 reviews)"
  buyerRecommendation: string; // "94% of buyers would purchase again"
  confidenceLevel: 'high' | 'medium' | 'low'; // based on review count
  reviewCount: number;
  avgRating: number;
  lastUpdated: string;
}
```

**Claude system prompt:**
```
You are an industrial marketplace trust analyst. Summarize this seller's reputation 
based on their reviews. Be honest — if there are recurring complaints, mention them 
constructively. Buyers are making large B2B purchases ($10K–$500K+) and need 
accurate information to make decisions.

Format strengths as evidence-backed claims: not "Great seller" but 
"Ships equipment as described (noted in X of Y reviews)."

Never make up claims not supported by the reviews. If the seller has fewer than 
5 reviews, note that confidence is low due to limited data.

Return ONLY valid JSON matching the schema.
```

**UI Integration:**

**On the seller storefront (`/sellers/[id]`):**

Replace raw star rating display with:
```
┌─────────────────────────────────────────────────────────┐
│  🛡️ Seller Reputation                                   │
│  ★★★★½  4.7  (34 reviews)                              │
│                                                         │
│  Fast, reliable, and accurate. Buyers consistently      │
│  note equipment arrives as described with honest        │
│  condition grading and quick communication.             │
│                                                         │
│  ✅ Ships as described (mentioned in 28 reviews)        │
│  ✅ Responds within 2 hours on average                  │
│  ✅ Accurate condition grading                          │
│  ⚠️ Shipping can run 2–3 days longer than estimated    │
│                                                         │
│  94% of buyers would purchase again                     │
└─────────────────────────────────────────────────────────┘
```

**Caching:** Generate and cache per-seller. Regenerate when a new review is posted.
```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS reputation_summary jsonb,
  ADD COLUMN IF NOT EXISTS reputation_summary_updated_at timestamptz;
```

**Cron trigger:** After any new review is submitted, queue a reputation re-generation for that seller (add to a simple `reputation_refresh_queue` table, processed by a nightly cron).

### 3. AI Dispute Mediation Assistant

**Problem:** When disputes are filed, admins spend significant time reading through both parties' evidence and statements to understand what happened.

**Solution:** Claude reads all dispute evidence and generates a neutral case summary to give admins a head start.

**Integration into existing dispute system (Cycle 7 — `/disputes`):**

**New server action:** `generateDisputeSummary(disputeId: string)`

Reads from DB:
- Original listing (title, description, photos, condition)
- Transaction record
- Buyer's dispute statement
- Seller's response statement
- All evidence uploads (photos/PDFs — pass as base64 to Claude Vision for image evidence)

**Response:**
```typescript
{
  summary: string;          // 2-3 paragraph neutral case summary
  buyerClaim: string;       // distilled from their statement
  sellerPosition: string;   // distilled from their statement
  keyFactsAgreedOn: string[];
  keyDisagrements: string[];
  evidenceAssessment: string; // what the photos/docs show
  possibleOutcomes: Array<{
    outcome: string;          // e.g. "Full refund to buyer"
    reasoning: string;
    precedent: string;        // "Standard when equipment condition misrepresented"
  }>;
  recommendedAction?: string; // Claude's neutral suggestion
  confidenceInRecommendation: 'high' | 'medium' | 'low';
  flaggedIssues?: string[];   // "Seller's photo appears to be from a different unit"
}
```

**Admin UI — Dispute detail page:**

Add an "AI Case Summary" panel at the top of the dispute admin view:
```
┌─────────────────────────────────────────────────────────┐
│  🤖 AI Case Summary                    [Generate / Refresh]
│                                                         │
│  A buyer purchased a 2018 Sharples P-660 for $18,500   │
│  listed in "Good" condition. Upon delivery, the buyer   │
│  reports significant bowl wear not visible in listing  │
│  photos and claims condition should have been "Fair."  │
│                                                         │
│  Key disagreement: Whether bowl wear was pre-existing  │
│  or occurred during shipping.                          │
│                                                         │
│  Evidence: Buyer's post-delivery photos show wear.     │
│  Seller's pre-ship photos do not show the same area.   │
│  ⚠️ Flagged: Lighting differences suggest different   │
│     equipment may appear in seller's reference photos. │
│                                                         │
│  Possible outcomes:                                     │
│  1. Full refund — if misrepresentation confirmed       │
│  2. Partial refund ($2,000–$3,000) — shared liability  │
│  3. No refund — if shipping damage is proven           │
│                                                         │
│  Recommendation: Partial refund — medium confidence    │
└─────────────────────────────────────────────────────────┘
```

- "Generate" button fires on demand — not auto (to control costs)
- Summary is stored in `disputes.ai_summary jsonb` once generated
- All admin actions still fully human — Claude is advisory only
- Include disclaimer: "This is an AI-generated summary to assist review. Final decisions are made by Metal Gear staff."

---

## Commit & Deploy
- Commit: `feat: smart search alerts, AI reputation summarizer, dispute mediation assistant`
- Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
- Push + Vercel deploy

---

## Next Prompt
Prompt 15-2 builds the Weekly AI Business Brief, Churn Prediction, and Market Gap Alert systems.
