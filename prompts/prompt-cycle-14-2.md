# Cycle 14 — Prompt 2: SOS AI Features
## Auto-Categorization · Response Ranker · Predictive Demand Alerts
## Metal Gear · Industrial Equipment Marketplace

---

## Context

You are continuing development of Metal Gear. The SOS broadcast system is live. This prompt adds three AI layers to the SOS system: auto-categorization (so buyers in crisis don't have to fill forms), a response quality ranker (so the best match surfaces first), and predictive demand alerts (so sellers know when to be ready).

---

## Goal

The SOS moment is a crisis moment. Remove every possible point of friction for the buyer and maximize the quality of the match they receive.

---

## Deliverables

### 1. API Route — `src/app/api/sos/ai/route.ts`

Three actions:

**Request (POST):**
```typescript
{
  action: 'categorize' | 'rank_responses' | 'predict_demand';

  // For categorize:
  description?: string;          // user's free-text description of what they need

  // For rank_responses:
  sosRequestId?: string;         // load SOS + all responses from DB
  responses?: Array<{
    id: string;
    sellerId: string;
    sellerTrustScore: number;    // 0-100
    responseTime: number;        // minutes since SOS was posted
    priceEstimate?: number;
    leadTimeDays?: number;
    condition?: string;
    description: string;
    sellerEquipmentMatch: boolean; // did their inventory match the subcategory?
  }>;
  sosDetails?: {
    subcategory: string;
    urgency: string;
    requiredSpecs?: Record<string, string>;
    maxBudget?: number;
    locationLat?: number;
    locationLng?: number;
  };

  // For predict_demand:
  subcategory?: string;
  region?: string;
  lookbackDays?: number;         // default 365
}
```

**Response:**
```typescript
{
  // categorize
  categorization?: {
    tier1: string;
    tier2: string;
    subcategory: string;
    confidence: 'high' | 'medium' | 'low';
    extractedSpecs: Record<string, string>;
    extractedUrgency: 'critical' | 'urgent' | 'normal';
    extractedBrand?: string;
    suggestedTitle: string;      // e.g. "Alfa Laval Decanter — Urgent"
    clarifyingQuestion?: string; // if confidence is low
  };

  // rank_responses
  rankedResponses?: Array<{
    responseId: string;
    rank: number;
    score: number;              // 0-100
    reasoning: string;          // "Strong spec match, fast response, trusted seller"
    flags?: string[];           // "Price seems high for condition" etc.
  }>;
  rankingSummary?: string;

  // predict_demand
  prediction?: {
    nextPeakMonth: string;
    historicalPattern: string;  // "Demand spikes in Q1 and Q3"
    recommendedAction: string;  // "Stock 2-3 units by February"
    demandTrend: 'rising' | 'stable' | 'declining';
    topRequestingIndustries: string[];
    avgResponseRate: number;    // % of historical SOSs that got a response
    insight: string;
  };
}
```

### 2. SOS Auto-Categorization — "Plain Text SOS"

**New entry mode on the SOS create page:**

Currently, the SOS form requires: taxonomy picker → brand → model → urgency → photos → notes.

Add a "Quick SOS" mode that flips the flow:

```
┌─────────────────────────────────────────────────────────┐
│  🆘 Quick SOS — Describe what you need                  │
│                                                         │
│  "Need a Alfa Laval decanter centrifuge ASAP,          │
│   75HP minimum, for oily water — we're down"           │
│                                          [Get Help Now]│
│                                                         │
│  Or:  [Use detailed form →]                             │
└─────────────────────────────────────────────────────────┘
```

After user submits plain text:

**Step 1 — AI categorizes (2–4 seconds):**
```
┌─────────────────────────────────────────────────────────┐
│  📡 AI is routing your SOS...                           │
│  ████████████████████  Analyzing                        │
└─────────────────────────────────────────────────────────┘
```

**Step 2 — Show extracted details for confirmation:**
```
┌─────────────────────────────────────────────────────────┐
│  ✅ Got it — here's what I found:                       │
│                                                         │
│  Equipment:   Decanter Centrifuge                       │
│  Category:    Process Equipment → Centrifuges          │
│  Brand:       Alfa Laval (preferred)                    │
│  Specs:       75HP minimum                             │
│  Urgency:     🔴 CRITICAL (you're down)                 │
│                                                         │
│  Anything to add or correct?                           │
│  [Budget: ____________]  [Location: ____________]       │
│  [Add photo: 📷]                                        │
│                                                         │
│  [Send SOS Now 🆘]   [Edit Details]                    │
└─────────────────────────────────────────────────────────┘
```

- If confidence is low: show clarifying question inline before the confirmation
- "Critical" urgency auto-detected from keywords: "down", "urgent", "ASAP", "emergency", "offline", "production stopped"
- User can edit any extracted field inline
- "Send SOS Now" creates the SOS with AI-extracted fields + whatever user corrected

**Track:** `sos_requests.ai_categorized boolean DEFAULT false` — set true when Quick SOS was used.

### 3. SOS Response Ranker

When a buyer views responses to their SOS, show them ranked by AI quality score instead of just chronological order.

**On the SOS detail page (buyer view), in the responses list:**

```
┌─────────────────────────────────────────────────────────┐
│  📊 Best Match                                          │
│                                                         │
│  ⭐ #1  TechCentrifuge Inc.          Score: 94/100      │
│  "We have a LYNX 300 in excellent condition, $22,000,  │
│   available immediately, Houston TX"                   │
│  ✅ Strong spec match  ✅ Trusted seller  ✅ Fast response│
│                                                         │
│  #2   Gulf Coast Separations         Score: 78/100      │
│  ...                                                    │
│                                                         │
│  ⚠️ #3   Unknown Dealer              Score: 41/100      │
│  ⚠️ Price seems high for listed condition               │
└─────────────────────────────────────────────────────────┘
```

**Ranking factors (injected into Claude prompt):**
- Spec match: does the offered equipment meet the SOS requirements? (40 points)
- Seller trust score: 0–100 from reputation system (25 points)
- Response speed: faster = better within first 4 hours (15 points)
- Price vs market: within expected range (10 points)
- Condition match: meets or exceeds requested condition (10 points)

**Implementation:**
- Trigger ranking when: SOS has 3+ responses OR SOS is 2 hours old (whichever comes first)
- Cache ranking for 30 minutes (re-rank if new responses arrive)
- Store ranked order in `sos_requests.ranked_response_ids jsonb` (ordered array of response IDs)

### 4. Predictive Demand Alerts — Seller Dashboard

**New widget on the seller dashboard:** "📡 Upcoming Demand Forecast"

```
┌─────────────────────────────────────────────────────────┐
│  📡 Demand Forecast — Your Equipment Categories         │
│                                                         │
│  🔴 Decanter Centrifuges                                │
│     Demand historically spikes in Q1 (Jan–Mar)        │
│     7 SOSs in this category last January               │
│     Recommendation: Stock 2–3 units by Feb             │
│                                                         │
│  🟡 Industrial Gearboxes                                │
│     Stable demand year-round                            │
│     Avg 4.2 SOSs/month, 67% response rate             │
│     You have 0 active listings in this category        │
│                                                         │
│  🟢 Bearing & Seals                                     │
│     Demand rising (+34% vs last quarter)               │
│     Add inventory to capitalize on trend               │
└─────────────────────────────────────────────────────────┘
```

**Data source:**
- Query `sos_requests` table grouped by subcategory + month
- Pass historical SOS frequency data to Claude for pattern analysis
- Claude generates the insight + recommendation

**API call:** Once per day per user (cache result in their profile or a `seller_insights` table):
```sql
CREATE TABLE seller_demand_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  insights jsonb NOT NULL,
  generated_at timestamptz DEFAULT now(),
  valid_until timestamptz DEFAULT (now() + interval '24 hours')
);
```

**Cron job:** `src/app/api/cron/demand-insights/route.ts` — runs nightly, regenerates insights for users with active listings or Pro/Business subscriptions.

### 5. Admin SOS Intelligence — SOS Monitor Enhancement

In the admin `/admin/sos` panel (Cycle 11), add:

**"Demand Gap" tab:**
- Lists subcategories with high SOS volume but low response rates
- "27 SOSs for Ribbon Blenders this quarter — only 12% got a response"
- Actionable: admin can trigger targeted outreach to sellers in those subcategories
- Export as CSV for sales/BD team to use for seller recruitment

**"AI Quality" column in SOS table:**
- For each SOS, show whether AI categorization was used
- Show average response quality score (from ranker)
- Flag SOSs where all responses scored < 50 (poor match quality)

---

## Commit & Deploy
- Commit: `feat: SOS AI — plain text categorization, response ranker, predictive demand alerts`
- Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
- Push + Vercel deploy

---

## Next Prompt
Prompt 15-1 builds the Smart Saved Search Alert system and the AI Seller Reputation Summarizer.
