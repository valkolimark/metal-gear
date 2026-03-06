# Cycle 15 — Prompt 2: Weekly AI Business Brief · Churn Prediction · Market Gap Alerts
## Metal Gear · Industrial Equipment Marketplace

---

## Context

You are continuing development of Metal Gear. This final AI cycle builds three operator-facing intelligence features: a weekly AI business brief delivered to founders, a churn prediction system that flags users likely to cancel before they do, and a market gap alert system that identifies where to recruit more sellers.

---

## Deliverables

### 1. Weekly AI Business Brief — `src/app/api/cron/weekly-brief/route.ts`

**Runs:** Every Monday at 8:00 AM CT (Vercel cron schedule: `0 14 * * 1`)

**Recipients:** All superadmin users (query `profiles WHERE admin_role = 'superadmin'`)

**Data gathered (all server-side DB queries before Claude call):**

```typescript
interface WeeklyBriefData {
  period: { start: string; end: string };
  
  growth: {
    newSignups: number;
    newSignupsVsLastWeek: number;       // delta
    activeUsers: number;                 // logged in this week
    churnedUsers: number;               // cancelled subscription
  };

  listings: {
    newListings: number;
    soldListings: number;
    avgDaysToSell: number;
    topCategories: Array<{ subcategory: string; count: number }>;
    avgQualityScore: number;
  };

  revenue: {
    newMRR: number;
    churnedMRR: number;
    netMRR: number;
    boostRevenue: number;
    newSubscriptions: number;
    cancelledSubscriptions: number;
  };

  sos: {
    totalSOSBroadcasts: number;
    avgResponseRate: number;
    criticalSOSUnfulfilled: number;
    topRequestedEquipment: string[];
  };

  search: {
    topSearchTerms: string[];
    zeroResultSearches: string[];
    aiSearchAdoption: number;          // % of searches using AI
  };

  quality: {
    aiAssistAdoption: number;           // % of listings using AI assist
    avgPricingAccuracy: number;         // seller used price vs AI suggested
    fraudFlagsThisWeek: number;
  };

  anomalies: string[];                  // auto-detected via DB queries (spike/drop flags)
}
```

**Claude prompt:**
```
You are the business intelligence analyst for Metal Gear, a B2B industrial 
equipment marketplace in Houston, TX. Write a concise weekly executive brief 
for the founders.

Format:
1. **Week in Review** (2-3 sentences: what stood out)
2. **Key Numbers** (bullet list of most important metrics with context)
3. **What's Working** (1-3 specific things showing positive signals)
4. **Concerns** (1-3 things that need attention — be direct)
5. **Recommended Actions** (exactly 3 specific, actionable items for this week)
6. **One Insight** (one non-obvious observation from the data)

Tone: Direct, honest, founder-to-founder. No fluff. If something is bad, say it.
If something is great, say why it matters. Max 500 words total.

Return plain text formatted with markdown. This will be sent as email HTML.
```

**Email delivery via Resend:**

Subject: `Metal Gear Weekly Brief — Week of [Date]`

HTML email template with:
- Metal Gear header (dark `#0A0A0F` bg, `#FF6B2B` accent)
- Claude's brief rendered as formatted HTML
- Raw data table below the brief (collapsible/appendix)
- "View Admin Dashboard" CTA button
- Link to unsubscribe from weekly briefs

**Store each brief:**
```sql
CREATE TABLE weekly_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  raw_data jsonb NOT NULL,
  ai_brief text NOT NULL,
  sent_to text[] NOT NULL,    -- array of email addresses
  created_at timestamptz DEFAULT now()
);
```

Admin can view past briefs in System Settings → "Weekly Briefs Archive" (paginated list).

### 2. Churn Prediction System

**Goal:** Identify Pro/Business subscribers likely to cancel before their next billing date. Flag them for proactive outreach.

**Churn signal scoring — `src/lib/ai/churn-scorer.ts`:**

No Claude needed for scoring — pure heuristics run via a nightly cron. Claude is used only to generate the outreach message.

**Signal weights:**
```typescript
const churnSignals = {
  noLoginLast14Days: 30,
  listingViewsDropped50Percent: 20,
  messagesSentThisMonth: -15,      // negative = retention signal
  listingExpiredNotRenewed: 25,
  sosPostedThisMonth: -20,
  offerReceivedThisMonth: -25,
  subscriptionAge30DaysOrLess: 15, // new users churn more
  priceChangedDownRecently: 10,
  noListingsActive: 20,
};
// Score >= 50 = at-risk, >= 75 = high-risk
```

**Cron — `src/app/api/cron/churn-prediction/route.ts` (runs nightly):**

```sql
-- Store churn risk scores
CREATE TABLE churn_risk (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) UNIQUE,
  risk_score integer NOT NULL,
  risk_level text NOT NULL,   -- 'low' | 'at_risk' | 'high_risk'
  signals jsonb NOT NULL,     -- which signals fired
  last_calculated_at timestamptz DEFAULT now(),
  outreach_sent_at timestamptz,
  retained boolean            -- did they renew? set when subscription renews
);
```

**Admin view — in `/admin/users`, add a "Churn Risk" filter:**
- Filter: At-Risk / High-Risk only
- Adds a `🔴 HIGH RISK` or `🟡 AT RISK` badge on the user row
- Clicking opens user detail with churn signals shown

**AI Outreach Message Generation:**

For high-risk users, admins can click "Generate Outreach Email" on the user detail page. Claude generates a personalized retention email based on:
- The user's specific churn signals ("hasn't logged in in 3 weeks")
- Their best activity ("posted 12 listings, received 4 offers")
- Their subscription tier and value
- A tailored offer (e.g., "We'd like to offer you a 30-day extension")

```typescript
// API route: POST /api/admin/users/[id]/generate-outreach
// Returns: { subject: string; body: string; tone: string }
```

Show in admin UI as a draft — admin can edit before sending via Resend.

### 3. Market Gap Alert System

**Goal:** Automatically identify subcategories where SOS demand is unmet, and generate actionable seller recruitment targets.

**Cron — `src/app/api/cron/market-gaps/route.ts` (runs weekly, Sunday night):**

**Data query:**
```sql
-- SOSs with no responses, grouped by subcategory, last 90 days
SELECT
  subcategory,
  tier2,
  COUNT(*) as sos_count,
  COUNT(CASE WHEN response_count = 0 THEN 1 END) as unmatched_count,
  AVG(response_count) as avg_responses,
  ROUND(COUNT(CASE WHEN response_count = 0 THEN 1 END)::numeric / COUNT(*) * 100) as gap_pct
FROM (
  SELECT
    sr.subcategory,
    sr.tier2,
    COUNT(srsp.id) as response_count
  FROM sos_requests sr
  LEFT JOIN sos_responses srsp ON srsp.sos_request_id = sr.id
  WHERE sr.created_at > NOW() - INTERVAL '90 days'
  GROUP BY sr.id, sr.subcategory, sr.tier2
) sub
GROUP BY subcategory, tier2
HAVING COUNT(*) >= 3        -- only subcategories with meaningful SOS volume
ORDER BY gap_pct DESC;
```

**Claude analyzes the gaps:**
```
You are a business development analyst for a B2B industrial equipment marketplace.

Given this list of equipment subcategories with high demand but few suppliers, 
identify the top 5 recruitment opportunities and explain why each matters.

For each gap, provide:
- Why this gap exists (seasonal? niche? geography?)
- What type of seller to recruit (rebuilder, dealer, OEM distributor?)
- Estimated revenue potential if gap is filled
- Suggested outreach approach

Return ONLY valid JSON array.
```

**Storage:**
```sql
CREATE TABLE market_gap_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  gaps jsonb NOT NULL,           -- raw SQL results
  ai_analysis jsonb NOT NULL,    -- Claude's analysis
  created_at timestamptz DEFAULT now()
);
```

**Admin UI — In `/admin/analytics`, add a "Market Gaps" tab:**

```
┌─────────────────────────────────────────────────────────┐
│  📊 Market Gaps — Top Recruitment Opportunities         │
│  Last updated: Sunday, Mar 1, 2026                      │
│                                                         │
│  🔴 #1  Ribbon Blenders                                 │
│     23 SOSs in 90 days — 87% went unanswered           │
│     Recruit: Food & pharma equipment dealers            │
│     Est. monthly GMV if filled: $180K+                  │
│     [Draft Outreach Email] [Export Leads]               │
│                                                         │
│  🔴 #2  Industrial Gearbox Rebuild Services             │
│     18 SOSs — 72% unanswered                           │
│     ...                                                 │
└─────────────────────────────────────────────────────────┘
```

**"Draft Outreach Email" button:**
Triggers a Claude call to write a cold outreach email for recruiting a seller in that subcategory. Uses Metal Gear's voice, mentions the specific demand signal ("We're seeing 23 unmet requests for ribbon blenders in the Gulf Coast..."). Admin reviews and sends via their own email client (copy to clipboard).

---

## CHANGELOG Update

After all of Cycles 13–15 are complete, add this CHANGELOG entry:

```markdown
## [1.1.0] — 2026-XX-XX · AI Intelligence Layer

### Added
- **Conversational Search** — natural language to taxonomy filter translation via Claude; multi-turn refinement; "Describe Your Problem" entry point
- **AI Listing Copy Tools** — description generator with streaming text, title optimizer with alternatives, listing quality scorer (0–100) with improvement roadmap
- **AI Pricing Intelligence** — market-based price suggestions from comparable sales; private negotiation coach for buyers and sellers
- **SOS Auto-Categorization** — plain text SOS entry; Claude extracts taxonomy, urgency, specs from free-form description
- **SOS Response Ranker** — AI scores and ranks all responses to an SOS by spec match, trust score, speed, and price
- **Predictive SOS Demand Alerts** — seller dashboard widget forecasting equipment demand by category and season
- **Smart Saved Search Alerts** — Claude evaluates each new listing against saved searches; only sends notifications for genuinely relevant matches
- **AI Seller Reputation Summarizer** — replaces raw star ratings with plain-English reputation summaries, strengths, watchouts, and verified claims
- **AI Dispute Mediation** — Claude reads all dispute evidence and generates a neutral case summary with possible outcomes for admin review
- **Weekly AI Business Brief** — Monday morning email to founders with Claude-written executive summary, key metrics, concerns, and 3 recommended actions
- **Churn Prediction** — nightly heuristic scoring of subscription risk; AI-generated personalized outreach drafts for high-risk users
- **Market Gap Alerts** — weekly analysis of unmet SOS demand by subcategory; AI recruitment target identification with outreach email drafts

### Database
- New tables: `saved_search_alert_log`, `seller_demand_insights`, `offer_coaching_log`, `churn_risk`, `market_gap_reports`, `weekly_briefs`
- New columns: `sos_requests.ai_categorized`, `sos_requests.ranked_response_ids`, `listings.ai_price_suggested`, `listings.ai_price_accepted`, `disputes.ai_summary`, `profiles.reputation_summary`, `saved_searches.ai_query`, `saved_searches.is_ai_search`
```

---

## Final Commit & Deploy
- Commit: `feat: weekly AI brief, churn prediction, market gap alerts — AI layer complete`
- Update CHANGELOG.md with Cycles 13–15 entry
- Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
- Push + Vercel deploy
