# Metal Gear — Improvement Roadmap
## Strategy Session: March 6, 2026

All items from the morning strategy session. Ordered by implementation priority. Items with full prompts are linked. Items not yet designed are noted with their complexity and dependencies.

---

## Status Overview

| # | Item | Status | Cycle |
|---|------|--------|-------|
| — | Cloudflare R2 + Stream migration | ✅ Prompted | 16-0 |
| 12 | Multi-company profiles | ✅ Prompted | 16-1 |
| — | Avatar online status dot | 🔲 Design complete, needs prompt | 16-2 |
| 9 | Category-specific listing fields | 🔲 Design complete, needs prompt | 16-2 |
| 1 | AI listing confirmation screen | 🔲 To design | 16-3 |
| 3 | Photo capture guidance | 🔲 To design | 16-3 |
| 4 | AI model recognition + dimension check | 🔲 To design | 16-3 |
| 10 | Richer onboarding (company context) | 🔲 To design | 17-1 |
| 11 | Onboarding personas (rebuilder etc.) | 🔲 To design | 17-1 |
| 7 | End-user AI pricing philosophy | 🔲 To design | 17-1 |
| 5 | AI pricing run-first, caps later | 🔲 To design | 17-1 |
| 6 | Two pricing modes (fast vs max) | 🔲 Already in spec, needs David's factors encoded | 17-1 |
| 8 | Budget filter / snake protection | ✅ Decision: keep filters, don't optimize for abuse | — |
| 13 | Admin Control Tower enhancements | 🔲 To design | 17-2 |
| 14 | Most engaged users metric | 🔲 To design | 17-2 |
| 15 | Category performance analytics | 🔲 To design | 17-2 |
| 16 | Geographic analytics | ✅ Already exists in admin analytics | — |
| 17 | AI assist analytics | ✅ Already exists | — |
| 18 | Financial analytics enhancements | 🔲 To design | 17-2 |
| 19 | Site-wide config controls | ✅ Already exists in system settings | — |
| 20 | SOS priority engine | ✅ Already exists — flag: don't abuse for own companies | — |
| 21 | Post-transaction reputation feedback | 🔲 To design | 18-1 |
| 22 | Seed inventory from Separators | 🔲 After 16-0 deploy | Post 16-0 |
| 2 | Human QA review service (paid add-on) | 🔲 Long-term | Future |

---

## Cycle Plan

### Cycle 16-0 — Infrastructure (do first, before seeding)
**Cloudflare R2 + Stream Migration**
- Prompt: `cycle-16-0-cloudflare-migration.md`
- Zero Supabase Storage for new media
- Zero egress fees via media.metalgear.com CDN

### Cycle 16-1 — Foundation
**Multi-Company Profiles**
- Prompt: `cycle-16-1-multi-company-profiles.md`
- Schema, migration, switcher, all content → company_id
- Superadmin create company (no charge)

### Cycle 16-2 — Listing Quality
**Avatar Online Status + Category-Specific Fields + AI Confirmation**
- Avatar presence dot (Supabase Realtime Presence)
- Dynamic field templates per equipment subcategory
- AI spec confirmation screen before publish

### Cycle 17-1 — Intelligence Refinement
**Pricing Philosophy + Onboarding v2**
- End-user pricing tuning (David's domain factors)
- Company-context-aware onboarding
- Persona-based onboarding (rebuilder, plant manager, dealer)

### Cycle 17-2 — Analytics Expansion
**Admin Intelligence**
- Most engaged users metric
- Category performance analytics
- Enhanced financial exports

### Cycle 18-1 — Trust & Reputation
**Post-Transaction Experience**
- After-transaction feedback (pricing fairness, delivery, quality)
- Problem actor detection

---

## Design Notes — Items Not Yet Prompted

---

### Avatar Online Status Dot
**Approach:** Supabase Realtime Presence channel
- On login: client joins `presence` channel, broadcasts `{ user_id, online_at }`
- Online = active presence connection
- Offline = not in channel or last_seen > 5 minutes
- Green dot (online) / Grey dot (offline) as absolutely-positioned overlay on `<Avatar>`
- `<OnlineIndicator userId={id} />` wrapper component — works everywhere Avatar renders
- Show in: search results, seller storefronts, messaging, admin user table
- Real-time WebSocket updates (not polling) — Supabase Realtime handles natively

**DB:** No new table needed — presence is ephemeral in the Realtime channel.

**Consideration:** Only show status on company profiles / storefronts, not on personal identity. Since we're going multi-company, "Centrifuge World is online" is the right framing.

---

### #9 — Category-Specific Listing Fields

**Approach:** Dynamic field templates stored in DB, rendered at runtime.

**New table:**
```sql
CREATE TABLE category_field_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcategory TEXT NOT NULL UNIQUE, -- matches taxonomy subcategory key
  tier1 TEXT,
  tier2 TEXT,
  fields JSONB NOT NULL, -- array of field definitions
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Field definition shape:**
```json
{
  "key": "material_of_construction",
  "label": "Material of Construction",
  "type": "select",
  "options": ["316SS", "304SS", "Hastelloy", "Monel", "Inconel", "Carbon Steel", "Glass-lined"],
  "required": true,
  "ai_hint": "Used for pricing and description generation",
  "help": "Select the primary wetted material"
}
```

**Field types:** `text`, `number`, `select`, `multiselect`, `boolean`, `file`, `textarea`

**Foundation (all categories):**
```
- Year of manufacture (number, required)
- Operational status (select: Operational / Non-operational / Unknown, required)
- Location status (select: In yard / Still installed / Needs removal, required)
- Why selling (select: Surplus / Upgrade / Plant closure / Scrap, optional)
- MSDS/SDS sheet (file, optional)
```

**Specialized templates to build first (David's categories):**

**Decanter Centrifuges:**
- Bowl diameter + length (number, required)
- Material of construction (select, required)
- Process application / what it processed (text, required)
- Drive HP (number)
- RPM (number)
- Rebuild date (text)
- Can be loaded on flatbed? (boolean)
- Removal needed? Who removes? (text)
- Code welding / pressure rating (text)
- SDS sheet (file) — "Certificate of authenticity for what it processed"

**Basket Centrifuges:**
- Same as decanter + basket diameter x depth (number pair, required, used for AI dimension sanity check)

**Reactors:**
- Gallon capacity (number, required)
- Vessel material (select: SS316/SS304/Hastelloy/Monel/Inconel/Glass-lined/Carbon Steel, required)
- Baffle present (boolean)
- Baffle material (select, conditional on baffle=true)
- Drive present (boolean)
- Pressure rating PSI (number, required)
- Temperature rating °F (number, required)
- Full vacuum rated (boolean)
- Code welding certified (boolean)
- Plugged / sealed (boolean) — for tantalum reactors
- Port configuration (textarea)
- Alloy type if exotic (text)

**Mixers (Production):**
- Mixer type (select: Ribbon / Double Ribbon / Sigma / Z-blade / Wishbone / Paddle / other, required)
- Cubic feet capacity (number, required)
- Sanitary stainless (boolean)
- Mounting (select: Mezzanine / Platform / Legs / Floor mount)
- What was it mixing / process type (text, required)
- Jacketed (boolean)
- Full vacuum rated (boolean)
- Hydraulic or motor driven (select, conditional on sigma/Z)
- Blade material (text)

**Lab Mixers:**
- Same as mixers
- Extra emphasis: Manufacturer + Model (required, prominent placement)
- Prior use / process (text, required)

**Extruders:**
- Screw diameter (number, required)
- L/D ratio (number)
- Screw material (text)
- Drive HP (number)
- Barrel zones (number)
- Twin screw (boolean)

**Answers stored in:** existing `listings.specs` JSONB column — no schema change needed.

**Superadmin field template editor:**
- Located in admin settings
- UI to add/edit/reorder fields per subcategory
- No code deploy needed to add a new category's template
- JSON preview of the template

**AI connection:**
- Field template + answers are passed to Claude description generator
- `ai_hint` on each field tells Claude how to use it
- Dimension fields feed the sanity check system (#4)

---

### #1 — AI Listing Confirmation Screen

**Flow change:**
```
Current: AI reads nameplate → auto-fills fields → user continues
New:     AI reads nameplate → user sees "check screen" → confirms/corrects → continues
```

**Check screen shows:**
- Each AI-extracted field with its value
- Confidence indicator per field (high/medium/low)
- Editable inline — click any field to correct
- Warning badge on low-confidence fields: "Please verify — OCR had difficulty reading this"
- Dimension sanity warning if triggered: "This doesn't look like a [claimed size]. See comparison images."
- "Confirm and Continue" / "Edit More" actions

**Key behavior:**
- User cannot skip this screen
- All fields are editable before confirming
- Confirmation is logged: `listings.ai_assist_accepted = true` only after this screen
- Reduces liability: lister confirmed the AI's reading

---

### #4 — AI Dimension Sanity Check

**Trigger:** When listing subcategory is a centrifuge/basket centrifuge and bowl dimensions are entered.

**How it works:**
- Claude Vision re-examines the uploaded equipment photos
- Compares visual size/proportions against claimed dimensions
- If mismatch detected: surface a warning on the confirmation screen
- Warning: "Based on the photo, this appears to be closer to [estimated size]. Reference images for comparison: [show 2-3 similar equipment photos from our listings]"
- User can override (they're the expert) but must acknowledge the warning

**Implementation:** Add a `dimension_check` action to `/api/listings/analyze-image` route.

---

### #3 — Photo Capture Guidance

**Changes to AI capture flow step (Step 0 of listing wizard):**

Add explicit guidance cards before camera opens:
```
📸 Photo Requirements

Wide shots (required):
• Full equipment from front, side, rear
• Show overall condition clearly

Nameplate / Data Plate (required):
• Must be a very clear, in-focus photo
• All characters must be readable
• If faded: use flashlight, try multiple angles
• This is how we identify your exact model

Additional (recommended):
• Drive end and non-drive end
• Any damage or wear areas
• Interior if accessible
• Serial number plate (separate from nameplate)
```

Show this as a modal/overlay before camera activation, with "Got it" dismiss.
Add visual examples of good vs bad nameplate photos.

---

### #5, #6, #7 — Pricing Philosophy Refinements

**Decision:** Let AI run first based on marketplace comparables. Only introduce caps if prices drift to dealer-level.

**David's domain factors to encode in the pricing prompt:**
- Material of construction (SS316 vs carbon steel → significant price difference)
- What it was used for (food-grade vs chemical → affects resale value)
- Operational vs non-operational status
- Last rebuild date
- Code welding / pressure ratings (certified = premium)
- How long sitting (indoor vs outdoor storage)
- Removal costs (in yard vs installed = buyer cost consideration)

**Two modes (already in spec, just needs David's factors):**
1. **Fastest sale** — 10-15% below market median, explain trade-off
2. **Maximum return** — at/above market median, explain time-to-sell expectation

**End-user vs dealer tuning:** Add to system prompt: "Price for end-user-to-end-user transactions. Do not model dealer markup or retail pricing."

---

### #10, #11 — Onboarding v2 (post multi-company)

**New fields to capture at company creation (not just user onboarding):**
- Division / department (e.g., "3M Adhesives Division")
- Plant location (city + state, separate from company HQ)

**Persona system:**
```
What best describes your role?
○ Plant / Facility Manager — buying/selling surplus equipment
○ Equipment Dealer — buy, sell, broker industrial equipment  
○ Rebuild Shop — buy, repair, resell equipment
○ Engineering / Procurement — sourcing for projects
○ Scrap / Salvage — buying for material value
```

**Per-persona follow-ups:**

*Rebuild Shop:*
- What do you rebuild? (equipment type multiselect)
- Industries served? (industry multiselect)
- Services: Rebuild / Parts / Field service / Scrap cleanups

*Equipment Dealer:*
- Primary categories (taxonomy multiselect)
- Geographic reach

*Plant Manager:*
- Industry
- Pain points: Cost reduction / Downtime / Surplus liquidation / etc.

**AI context use:**
- If company = food manufacturer → AI expects food-grade equipment, sanitary stainless
- If company = oil & gas → AI expects explosion-proof ratings, NACE compliance
- Persona + industry context passed to description generator, pricing suggestions, SOS categorization

---

### #13, #14, #15 — Admin Analytics Enhancements

**Most Engaged Users:**
- Metric: logins + listings + SOS posts + messages + offers in last 30 days
- Show top 20 users/companies with engagement breakdown
- "Where they're engaging" — category heatmap per user
- Surface in Control Tower and Analytics panel

**Category Performance:**
- Listings per category (active, sold, expired)
- Days-to-sale by category
- SOS demand vs supply ratio per category
- "Underperforming" flag if <5% of listings result in offers
- Recommended action: "Centrifuges have 3× more SOS demand than listings — recruit sellers"

**Financial Enhancements:**
- Revenue breakdown: subscriptions vs boosts vs seat fees
- Failed payment retry tracking
- Churn rate by tier (monthly)
- MRR movement (new + expansion - contraction - churn)
- CSV export of any table

---

### #21 — Post-Transaction Feedback

**Trigger:** 3 days after transaction marked "delivered"

**Prompt both parties:**

*Buyer asked:*
- Equipment matched description? (1-5)
- Seller communication? (1-5)  
- Shipping / delivery speed? (1-5)
- Would you buy from this seller again? (yes/no)
- One sentence: anything we should know?

*Seller asked:*
- Buyer communication? (1-5)
- Payment speed? (1-5)
- Any issues with the transaction? (yes/no + text)

**Data use:**
- Feed into AI reputation summarizer (already built)
- Flag patterns: consistently late shipping, price disputes, bait-and-switch
- Surface problem actors to admin moderation queue

---

### #22 — Seed Inventory from Separators

**Plan (after Cycle 16-0 deploys):**
1. Create NRM company account via superadmin (no charge)
2. Create sub-companies: Centrifuge World, Mixer Works, Gear World
3. Import Separators inventory via bulk CSV upload
4. Run AI image capture on existing photos to test extraction
5. Verify: listing quality score, description generator, conversational search

**Goal:** Real inventory for testing all AI features with real industrial equipment at real prices.

---

### #2 — Human QA Review Service (Future)
**Concept:** Premium paid add-on where expert reviews AI-generated listing before publish.
**Not for now.** Design when marketplace has enough volume to staff it.
**Pricing idea:** $25-50 per listing review, or included in Enterprise tier.

---

## Key Decisions Made

| Topic | Decision |
|-------|----------|
| Storage: images | Cloudflare R2 — zero egress |
| Storage: videos | Cloudflare Stream — transcoding included |
| Company model | Mandatory, per-user-login multi-company |
| Subscriptions | Per company, not per user |
| Seat pricing | +$25/mo Premium/Boost, +$20/mo yearly, ~$15/mo Enterprise |
| Display name | Per-post choice; listings always company |
| Budget filters | Keep them — optimize for real buyers, not abuse prevention |
| SOS priority | Keep engine, don't abuse for own companies |
| AI pricing | Run first, introduce caps only if drift detected |
| Pricing philosophy | End-user-to-end-user, not dealer markup |
| AI confirmation | Required screen before publish — no skip |
| Field templates | Universal foundation + specialized per David's categories |
| Template management | Superadmin UI editor, no code deploy needed |
