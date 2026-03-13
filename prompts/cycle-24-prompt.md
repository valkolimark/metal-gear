# Metal Gear — Cycle 24: Contact Credit System

## Context

Read `CLAUDE.md` and `CHANGELOG.md` before starting. Cycle 22 added seller contact info with basic tier-gating (Pro+ can see contact info). This cycle replaces that simple gating with a credit-based reveal system — a standalone revenue layer that works alongside subscriptions.

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

Build a contact credit system: users get a monthly credit allowance by tier, spend credits to reveal seller contact info, and can purchase additional credits via Stripe. This creates a monetization layer independent of subscriptions.

---

## Credit Allowance by Tier

| Tier | Monthly Credits | Cost per Extra Credit |
|------|-----------------|-----------------------|
| Free | 0 | $5.00 |
| Pro | 25 | $3.00 |
| Business | 75 | $2.00 |
| Enterprise | Unlimited | N/A |

Credits reset on the 1st of each month. Unused credits do not roll over.

Sellers with `contact_visibility = 'hidden'` cost 0 credits — they simply show nothing regardless.
Sellers with `contact_visibility = 'public'` are free to reveal for all logged-in users (no credit cost).
Sellers with `contact_visibility = 'pro_plus'` cost 1 credit to reveal (replaces the simple Pro+ gate from Cycle 22).

---

## DB Schema

```sql
-- Credit ledger per user
CREATE TABLE IF NOT EXISTS contact_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  credits_remaining INTEGER NOT NULL DEFAULT 0,
  credits_used_this_month INTEGER NOT NULL DEFAULT 0,
  period_start DATE NOT NULL DEFAULT date_trunc('month', now()),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, period_start)
);

-- Log of each reveal (idempotent — same user/seller pair in same month = free re-reveal)
CREATE TABLE IF NOT EXISTS contact_reveals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  credits_spent INTEGER NOT NULL DEFAULT 0,
  revealed_at TIMESTAMPTZ DEFAULT now(),
  listing_id UUID REFERENCES listings(id),
  UNIQUE(viewer_id, seller_id, date_trunc('month', revealed_at))
);

-- Credit purchases via Stripe
CREATE TABLE IF NOT EXISTS credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  credits_purchased INTEGER NOT NULL,
  amount_paid INTEGER NOT NULL, -- cents
  stripe_payment_intent_id TEXT,
  purchased_at TIMESTAMPTZ DEFAULT now()
);
```

**RLS:**
- `contact_credits`: users can read/update their own row only
- `contact_reveals`: users can read their own reveals; insert via server action only
- `credit_purchases`: users can read their own; insert via server action only

---

## Credit Reset Cron

Add a monthly cron job (`/api/cron/reset-credits`) that runs on the 1st of each month at midnight CT:
- For every user, insert or update their `contact_credits` row for the new period with the correct starting balance based on their current tier
- Set `credits_used_this_month = 0`
- Log the reset to `admin_audit_log`

Add to Vercel cron schedule: `0 6 1 * *` (1st of month, 6am UTC = midnight CT)

---

## Server Actions

**`revealContactInfo(viewerId, sellerId, listingId?)`**
1. Check if this viewer already revealed this seller this month — if yes, return cached contact info at no credit cost
2. Check seller's `contact_visibility` — if `hidden`, return null; if `public`, return contact info at no cost
3. Check viewer's `credits_remaining` in `contact_credits` for current period
4. If sufficient credits: deduct 1 credit, insert into `contact_reveals`, return contact info
5. If insufficient credits: return `{ error: 'insufficient_credits', creditsRemaining: N }`
6. Never return contact info without going through this action

**`getCreditBalance(userId)`**
Returns `{ creditsRemaining, creditsUsedThisMonth, period }` for the current month.

**`purchaseCredits(userId, quantity)`**
Creates a Stripe Checkout session for credit purchase. Price per credit depends on user tier (see table above). On success webhook, add credits to user's ledger.

**`getRevealedContacts(userId)`**
Returns list of seller IDs this user has already revealed this month (for UI to show revealed state without re-spending).

---

## UI — Listing Detail Page

Replace the Cycle 22 tier-gating UI with the credit reveal interaction:

**State: Not yet revealed (pro_plus visibility)**
```
📞  ••••••••••
✉️  ••••••••••
[Reveal Contact Info — 1 credit]
                    You have 12 credits remaining
```

**State: Already revealed this month (free re-reveal)**
```
📞  (713) 555-0123
✉️  john@acmeindustrial.com
```

**State: No credits remaining**
```
📞  ••••••••••
✉️  ••••••••••
[Reveal Contact Info — 1 credit]
You have 0 credits.  [Buy more credits] or [Upgrade plan]
```

**State: Free user (0 monthly credits)**
```
📞  ••••••••••  
✉️  ••••••••••
[Upgrade to Pro for 25 monthly credits →]
```

**State: Enterprise or public visibility**
Contact info shown directly, no credit UI.

The reveal action should be optimistic — show a loading state, then reveal inline without page reload.

---

## UI — Credit Balance Page

New page: `/credits`

Sections:
- Current balance: large number, "credits remaining this month"
- Reset date: "Resets on [date]"
- Monthly allowance by tier (table showing all tiers)
- Purchase additional credits: quantity selector + price display + "Buy Credits" button (Stripe Checkout)
- Transaction history: table of purchases and reveals this month

Link to this page from:
- User dropdown in desktop header ("My Credits")  
- Mobile menu drawer
- The "Buy more credits" link in the listing reveal UI

---

## UI — Admin

In the admin User Detail page (`/admin/users/[id]`), add a Credits section:
- Show current balance and monthly allowance
- "Grant Credits" input + button (admin can add credits without Stripe)
- Log the grant to `admin_audit_log`

---

## Stripe — Credit Packs

Add credit pack products to the Stripe checkout flow (not subscriptions — one-time payments):

| Pack | Credits | Price |
|------|---------|-------|
| Starter | 10 | $29 |
| Standard | 30 | $69 |
| Pro Pack | 100 | $179 |

These are one-time purchases. Handle in the existing Stripe webhook — detect `credit_purchase` metadata in the checkout session and credit the user's ledger.

---

## Files to Create/Modify

- `src/app/(main)/credits/page.tsx` — new credits page
- `src/app/actions/credits.ts` — all credit server actions
- `src/app/(main)/listings/[id]/components/listing-purchase-panel.tsx` — reveal UI
- `src/app/(main)/listings/[id]/components/mobile-purchase-bar.tsx` — reveal UI
- `src/app/(main)/listings/[id]/page.tsx` — remove Cycle 22 tier-gate logic, pass credit state
- `src/app/(admin)/admin/actions.ts` — grant credits action
- `/api/cron/reset-credits` — monthly credit reset
- `/api/webhooks/stripe` — handle credit purchase checkout sessions
- Vercel cron config — add monthly reset schedule

---

## Edge Cases & Validation

- Seller views their own listing: show their own contact info without spending credits
- User reveals, then seller changes visibility to `hidden`: re-reveal check returns null (seller preference always wins)
- Concurrent reveals: use a DB transaction or upsert to prevent double-spending credits
- Free tier user with 0 allowance: show upgrade prompt, not a "buy credits" flow — buying credits without a subscription is allowed but upgrading is the better path
- Credit purchase webhook fires twice (Stripe retry): idempotency on `stripe_payment_intent_id`
- Month rollover mid-session: if user's period_start is stale, refresh their balance before any reveal

---

## Success Criteria

- [ ] Credit ledger created and seeded correctly for all existing paid users
- [ ] Monthly reset cron runs and resets balances correctly
- [ ] Reveal interaction deducts 1 credit and shows contact info
- [ ] Re-reveal within same month is free
- [ ] Insufficient credits shows correct UI with buy/upgrade options
- [ ] Credit purchase via Stripe works end-to-end
- [ ] `/credits` page shows balance, history, and purchase option
- [ ] Admin can grant credits from user detail page
- [ ] Enterprise users and public visibility listings show contact info directly (no credits)
- [ ] No TypeScript errors, no console errors

---

## After Completing This Cycle

1. Update `CHANGELOG.md` with a `[3.5.0]` entry
2. Update `README.md` — document credit system and `/credits` page
3. Update `CLAUDE.md` — document credit tables, server actions, cron, Stripe products
4. Deploy and verify

---

## Commit Message

```
feat(cycle-24): contact credit system

- Credit ledger by tier: Free 0 / Pro 25 / Business 75 / Enterprise unlimited
- Reveal interaction: 1 credit to see seller contact info
- Same-month re-reveals free (idempotent)
- Monthly credit reset cron (1st of month)
- Stripe one-time credit pack purchases (10/30/100 credits)
- /credits page: balance, history, purchase
- Admin: grant credits from user detail page
- Replaces simple Pro+ tier gate from Cycle 22

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
