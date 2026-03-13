# Metal Gear — Cycle 23: Onboarding Redesign

## Context

Read `CLAUDE.md` and `CHANGELOG.md` before starting. Cycles 21–22 are complete. This cycle is a full redesign of the onboarding flow. It is the most user-facing change in several cycles and will determine how every new user understands and configures their Metal Gear experience.

**Guiding principle: Irrelevant questions must never appear.** Every step a user sees must be relevant to their stated role. Branching is not optional — it is the core design pattern.

**Live app:** https://metal-gear-five.vercel.app  
**GitHub:** valkolimark/metal-gear (branch: main)  
**Supabase project:** fkcyfpdkcrhjieauhchn  
**Vercel team:** team_9n9GosoaraicsoDdbAFgzr5j  
**Vercel project:** prj_HQBv7jMhui6LGW5vzVC5pmCMndlx

---

## Critical Rule (always)

All DB operations MUST use server actions with `createAdminClient()`. Never client-side Supabase calls. Never pass functions from Server Components to Client Components.

## Deployment (always)

```bash
curl -s -X POST "https://api.vercel.com/v13/deployments?teamId=team_9n9GosoaraicsoDdbAFgzr5j" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"metal-gear","project":"prj_HQBv7jMhui6LGW5vzVC5pmCMndlx","gitSource":{"type":"github","ref":"main","org":"valkolimark","repo":"metal-gear"},"target":"production"}'
```

---

## Objective

Replace the existing 6-step onboarding wizard with a role-aware branching flow that captures richer, more relevant user data and sets up each user's experience correctly from day one.

---

## Three User Archetypes

Every onboarding path starts with archetype selection. The three archetypes:

**Operator** — Plant manager, maintenance manager, process engineer, procurement. They run facilities and need equipment to keep them running.

**Trader** — Dealers, rebuilders, rental companies, surplus buyers, used equipment resellers. They buy and sell equipment as their business.

**Service Provider** — Logistics, rigging, crane, forklift, machine shop, demolition, scrap, inspection companies. They provide services that support equipment transactions.

---

## Onboarding Flow Architecture

### Step 1 — Archetype Selection (all users)

Full-screen card selection. Three large cards, one per archetype. Each card has:
- Icon (use appropriate Lucide icon)
- Archetype name (large, bold)
- 2-line description of who this is for
- Examples in smaller text

User selects one. Selection is visually highlighted. "Continue" button activates on selection.

Single-select only. A user who is both an Operator and a Trader should pick the primary identity — they can update later in settings.

---

### Step 2 — Industries (all users, multi-select)

**Headline:** "Which industries do you work in?"

**Options (multi-select, minimum 1 required):**
- Oil & Gas
- Petrochemical
- Mining
- Manufacturing
- CNC Machining
- Food & Beverage
- Pharmaceutical
- Plastics & Chemicals
- Dairy
- Pulp & Paper
- Power Generation
- Other

Render as a grid of toggle chips/cards. User can select multiple. "Other" opens a short text field.

---

### Step 3 — Role-Specific Questions (branches by archetype)

#### Branch A: Operator

**Headline:** "Tell us about your role"

Sub-role selection (single select):
- Plant Manager
- Maintenance Manager
- Process Engineer
- Procurement / Purchasing
- Operations Manager
- Other

Then: **"What types of equipment are in your facility?"**
Multi-select from the 3-tier taxonomy Tier 2 groups (show all 28 groups as toggle chips). User picks all that apply. This seeds their feed and SOS matching.

Then: **"How do you typically source equipment?"**
Multi-select:
- Purchase new
- Purchase used/surplus
- Rental
- Rebuild/refurbish in-house
- Contract out for repairs

#### Branch B: Trader

**Headline:** "How do you operate?"

Multi-select (they can be multiple):
- Buy equipment
- Sell equipment
- Rebuild / refurbish equipment
- Rent equipment

Then: **"What equipment do you specialize in?"**
Multi-select from Tier 2 taxonomy groups. This seeds their listing defaults and SOS notifications.

Then: **"How many units do you typically handle per month?"** (single select)
- 1–5
- 6–20
- 21–50
- 50+

#### Branch C: Service Provider

**Headline:** "What type of services do you provide?"

Multi-select (pick all that apply):
- Trucking / Freight
- Rigging & Crane
- Forklift Rental / Sales
- Machine Shop / Machining
- Rebuilding / Repair
- Inspection & Certification
- Demolition
- Scrap & Recycling / Boneyard
- Millwright Services
- Other

Then: **"What is your service area?"** (single select)
- Local (within 100 miles)
- Regional / Statewide
- National
- International

Then: **"What equipment types do your services support?"**
Multi-select from Tier 2 taxonomy groups (so their profile appears in relevant SOS responses).

---

### Step 4 — SOS & Transparency (all users)

**Two questions on one screen:**

**"Do you want to receive SOS alerts?"**
Toggle (default ON). Explanation: "SOS alerts notify you when someone urgently needs equipment or services matching your profile. High-value opportunities often go to whoever responds first."

**"Are you open to being contacted directly by other members?"**
Three options (radio):
- Yes, show my contact info to Pro members and above
- Yes, show my contact info to everyone
- No, keep me reachable via internal messaging only

(This maps to the `contact_visibility` field from Cycle 22.)

---

### Step 5 — Profile Completion (all users)

**Headline:** "Almost done — set up your profile"

Fields:
- Display name (pre-filled from auth name if available)
- Company name (required)
- City, State (required — auto-detect with permission, or manual entry)
- Profile photo (optional — skip-able)
- Phone number (optional)

"Finish Setup" button completes onboarding.

---

## DB Changes

Check existing `user_business_profiles` and `user_equipment_interests` tables before migrating — the current schema may already capture some of this. Add only what's missing.

```sql
-- Add archetype to user_business_profiles if not present
ALTER TABLE user_business_profiles
  ADD COLUMN IF NOT EXISTS archetype TEXT CHECK (archetype IN ('operator', 'trader', 'service_provider')),
  ADD COLUMN IF NOT EXISTS sub_role TEXT,
  ADD COLUMN IF NOT EXISTS trading_activities TEXT[],   -- ['buy', 'sell', 'rebuild', 'rent']
  ADD COLUMN IF NOT EXISTS service_types TEXT[],        -- for service providers
  ADD COLUMN IF NOT EXISTS service_area TEXT,           -- 'local' | 'regional' | 'national' | 'international'
  ADD COLUMN IF NOT EXISTS sourcing_methods TEXT[],     -- for operators
  ADD COLUMN IF NOT EXISTS monthly_volume TEXT,         -- for traders
  ADD COLUMN IF NOT EXISTS sos_opted_in BOOLEAN DEFAULT true;

-- Industries stored as array (check if already exists)
ALTER TABLE user_business_profiles
  ADD COLUMN IF NOT EXISTS industries TEXT[];
```

The existing `user_equipment_interests` table stores tier1/tier2/subcategories — continue using it for equipment type selections from onboarding Step 3.

---

## Implementation Notes

**Client-side state:** The onboarding wizard is a multi-step client component. Store step progress and all form values in local React state (not DB) until the final "Finish Setup" submit. On submit, write everything in a single server action call to avoid partial saves.

**Progress indicator:** Show "Step N of 5" at the top. On mobile, keep this minimal — just the step count, no long step names.

**Back navigation:** Every step has a "Back" button. Going back preserves selections made in that step.

**Skip:** Steps 3 sub-questions (equipment types, etc.) should be skippable — show a "Skip for now" link. Archetype (Step 1), Industries (Step 2), and Company/Location (Step 5) are required.

**Middleware guard:** The existing onboarding middleware redirects users who haven't completed onboarding. Keep this behavior. Mark onboarding complete in `profiles.onboarding_completed` (or equivalent column) only after Step 5 submission.

**Existing users:** Do not re-trigger onboarding for users who have already completed it. The redesign applies to new signups only.

**Mobile-first:** The onboarding pages must be fully functional and look good at 390px. Large tap targets, no horizontal overflow, stacked layouts.

---

## Files to Create/Modify

- `src/app/(main)/onboarding/` — full rewrite of all onboarding step pages/components
- `src/app/actions/onboarding.ts` — server action for final onboarding submission
- `user_business_profiles` table — DB migration for new columns

---

## Edge Cases & Validation

- User refreshes mid-onboarding: if steps are in client state, they restart from Step 1 (acceptable — onboarding is short)
- User selects "Other" for industry: text input appears, value saved as custom string
- Step 3 equipment picker: the Tier 2 taxonomy has 28 groups — render as a scrollable multi-select grid, not a dropdown
- Service provider selects "Rigging & Crane" but not logistics: only rigging-relevant follow-ups shown (the service type multi-select drives what's shown)
- Existing `user_equipment_interests` rows: the migration server action should insert rows for each selected Tier 2 group

---

## Success Criteria

- [ ] New user sees archetype selection as first step after signup
- [ ] Three distinct branches render with correct role-specific questions
- [ ] Multi-industry selection works (minimum 1 required)
- [ ] Equipment type multi-select populates `user_equipment_interests` correctly
- [ ] SOS opt-in and contact visibility saved correctly
- [ ] Profile completion (name, company, city) saved to `profiles` and `user_business_profiles`
- [ ] Onboarding completion flag set — user not redirected back to onboarding after finishing
- [ ] Fully functional on mobile (390px), no overflow, large tap targets
- [ ] Existing users unaffected
- [ ] No TypeScript errors, no console errors

---

## After Completing This Cycle

1. Update `CHANGELOG.md` with a `[3.4.0]` entry
2. Update `README.md` — describe new onboarding flow and archetypes
3. Update `CLAUDE.md` — document archetype system, new DB columns, onboarding server action
4. Deploy and verify

---

## Commit Message

```
feat(cycle-23): role-aware onboarding redesign

- Three archetypes: Operator, Trader, Service Provider
- Multi-industry selection (replaces single industry)
- Branching Step 3: role-specific questions per archetype
- Equipment type multi-select seeds feed and SOS matching
- SOS opt-in and contact visibility captured at onboarding
- Single server action submit on completion (no partial saves)
- Mobile-first: fully functional at 390px

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
