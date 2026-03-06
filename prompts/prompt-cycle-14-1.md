# Cycle 14 — Prompt 1: AI Pricing Intelligence
## Market Price Suggestions · Offer Negotiation Assistant
## Metal Gear · Industrial Equipment Marketplace

---

## Context

You are continuing development of Metal Gear. Previous cycles built conversational search and listing copy tools. This prompt adds two financial intelligence features: AI-powered price suggestions when sellers create listings, and a private negotiation coach for buyers and sellers during the offer process.

---

## Goal

Help sellers price accurately (reducing days-on-market) and help both sides negotiate confidently — while keeping all AI guidance private and non-binding.

---

## Deliverables

### 1. Market Data Foundation

Before AI pricing can work, collect comparable sales data. Add these queries:

```sql
-- View: comparable sold listings for pricing reference
CREATE OR REPLACE VIEW pricing_comparables AS
SELECT
  l.id,
  l.title,
  l.manufacturer,
  l.model,
  l.tier2,
  l.subcategory,
  l.condition,
  l.year,
  l.price,
  l.specs,
  l.location,
  l.created_at,
  l.updated_at,
  l.status,
  -- Days on market (for sold listings)
  EXTRACT(DAY FROM (l.updated_at - l.created_at)) AS days_on_market,
  -- Geographic region bucket
  CASE
    WHEN l.location ILIKE '%houston%' OR l.location ILIKE '%texas%' THEN 'Gulf Coast'
    WHEN l.location ILIKE '%louisiana%' OR l.location ILIKE '%mississippi%' THEN 'Gulf Coast'
    ELSE 'Other US'
  END AS region
FROM listings l
WHERE l.status IN ('active', 'sold')
  AND l.price IS NOT NULL
  AND l.price > 0;
```

### 2. API Route — `src/app/api/listings/ai-pricing/route.ts`

**Request (POST):**
```typescript
{
  action: 'suggest_price' | 'coach_negotiation';

  // For suggest_price:
  listing?: {
    tier2: string;
    subcategory: string;
    manufacturer?: string;
    model?: string;
    condition?: string;
    year?: number;
    specs?: Record<string, string>;
    location?: string;
  };

  // For coach_negotiation:
  negotiation?: {
    side: 'buyer' | 'seller';
    listingId: string;
    askPrice: number;
    offerPrice: number;
    offerCount: number;        // how many rounds so far
    daysOnMarket: number;
    condition: string;
    subcategory: string;
    comparableStats?: {        // injected from DB query
      medianPrice: number;
      minPrice: number;
      maxPrice: number;
      avgDaysOnMarket: number;
      sampleSize: number;
    };
  };
}
```

**Response:**
```typescript
{
  // suggest_price
  pricing?: {
    suggestedMin: number;
    suggestedMax: number;
    suggestedTarget: number;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;         // "Based on 8 comparable sales..."
    comparables: Array<{
      title: string;
      price: number;
      condition: string;
      daysOnMarket: number;
      soldOrActive: 'sold' | 'active';
    }>;
    marketInsight: string;     // "Decanter centrifuge demand is high in Gulf Coast right now"
    pricingTips: string[];     // 2-3 actionable tips
  };

  // coach_negotiation
  coaching?: {
    assessment: string;        // "This offer is 23% below ask — here's how to think about it"
    recommendedAction: string; // "Counter at $21,500"
    recommendedPrice?: number;
    rationale: string;
    acceptanceProbability: 'high' | 'medium' | 'low';
    redFlags?: string[];       // e.g. "Seller has been on market 60+ days, likely motivated"
    talkingPoints?: string[];  // what to say in your response message
  };
}
```

**For `suggest_price`:** Query `pricing_comparables` view for similar equipment (same tier2 + subcategory, similar condition), pass results to Claude with the listing details. Claude synthesizes a price recommendation.

**For `coach_negotiation`:** Claude acts as a private deal coach. System prompt:
```
You are a confidential negotiation advisor for industrial equipment transactions. 
You help {side} make smart decisions based on market data, without being visible 
to the other party. Be direct and give a specific recommended action.

Never suggest accepting a deal that's clearly below market unless the equipment 
has serious issues. Never suggest overpricing that will kill the deal.
This advice is private — only the {side} sees it.
```

### 3. Price Suggestion UI — Listing Creation Form

**Placement:** On the price field in the listing creation form:

```
┌─────────────────────────────────────────────────────────┐
│  Price (USD)                                            │
│  [$_________________________]  [Get AI Price Estimate] │
│                                                         │
│  After clicking:                                        │
│  ─────────────────────────────────────────────────────  │
│  📊 Market Price Estimate                               │
│                                                         │
│  Suggested range:  $18,000 — $24,000                   │
│  Target price:     $21,000   ← [Use This]              │
│  Confidence:       ████████░░  High (8 comparables)    │
│                                                         │
│  Based on:                                              │
│  • Alfa Laval LYNX 300 (Good) sold for $19,500 — 12d  │
│  • Sharples P-600 (Excellent) active at $24,000        │
│  • Generic Decanter, 75HP (Fair) sold for $14,000      │
│                                                         │
│  💡 Listing at $21,000: fastest sale                   │
│     Listing at $23,500: maximizes return, ~30 more days│
│                                                         │
│  [Use $21,000]  [Use $23,500]  [Set my own price]      │
└─────────────────────────────────────────────────────────┘
```

- Only appears after subcategory and condition are set (required to fetch comparables)
- If fewer than 3 comparables found: show "Low confidence — limited comparable sales data" with a note
- If 0 comparables: skip the modal, show only a text note "No recent comparable sales found. Consider researching Machinio or EquipNet for pricing reference."
- Don't block publishing — this is advisory only
- Log whether the seller used the suggested price (`ai_price_accepted`, `ai_suggested_price` columns)

```sql
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS ai_price_suggested numeric,
  ADD COLUMN IF NOT EXISTS ai_price_accepted boolean DEFAULT false;
```

### 4. Offer Negotiation Coach — Private Per-Side Widget

**Placement:** On the offer detail page (`/offers/[id]`), show a private coaching panel — visible only to the viewing user, never to the counterparty.

**Seller view (received an offer):**
```
┌─────────────────────────────────────────────────────────┐
│  🤝 Private Deal Coach                    [Only you see this]
│                                                         │
│  Offer received: $16,500 on your $22,000 ask           │
│  That's 25% below ask.                                  │
│                                                         │
│  📊 Market context:                                     │
│  Median comparable sale: $19,800                        │
│  Your listing: 18 days on market (avg is 34 days)      │
│                                                         │
│  💡 Recommendation: Counter at $20,500                  │
│  This offer has medium acceptance probability.          │
│  You're still early in your listing window.            │
│                                                         │
│  What to say:                                           │
│  "Appreciate the offer — based on recent comparables,  │
│   I'm comfortable countering at $20,500."              │
│                                                         │
│  [Load new analysis]                                    │
└─────────────────────────────────────────────────────────┘
```

**Buyer view (made an offer):**
```
┌─────────────────────────────────────────────────────────┐
│  🤝 Private Deal Coach                    [Only you see this]
│                                                         │
│  Your offer: $16,500 on a $22,000 listing              │
│  Seller has been listed 18 days (average: 34 days)     │
│                                                         │
│  📊 Market context:                                     │
│  This equipment typically sells for $18K–$24K          │
│  Your offer is below typical market range.             │
│                                                         │
│  💡 If rejected: Counter with $18,500                  │
│  Acceptable to most sellers in this range.             │
│  Acceptance probability: Medium                         │
│                                                         │
│  [Load new analysis]                                    │
└─────────────────────────────────────────────────────────┘
```

- Loaded on demand (click to expand) — don't auto-load to save API costs
- Cache analysis per offer (same offer, same state = same result) for 6 hours
- Store coaching interactions: `offer_id`, `side`, `recommended_price`, `followed_recommendation` (boolean, set when offer is accepted/countered at the recommended price ± 5%)

```sql
CREATE TABLE offer_coaching_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid REFERENCES offers(id),
  user_id uuid REFERENCES profiles(id),
  side text,
  recommended_price numeric,
  reasoning text,
  created_at timestamptz DEFAULT now()
);
```

### 5. Admin View: Pricing Intelligence Dashboard

In the admin Analytics panel, add a "Pricing Intelligence" subsection:
- Average price accuracy: seller's final price vs AI suggested price (for sellers who used the tool)
- Days on market: AI-priced listings vs manually priced listings
- Offer acceptance rate: deals where coaching was used vs not

---

## Commit & Deploy
- Commit: `feat: AI pricing suggestions and private negotiation coaching`
- Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
- Push + Vercel deploy

---

## Next Prompt
Prompt 14-2 builds SOS AI features: auto-categorization from plain text, response ranker, and predictive SOS demand alerts.
