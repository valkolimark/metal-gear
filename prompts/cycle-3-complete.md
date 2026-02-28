# Cycle 3 — Monetization, Polish & Production Readiness (Complete)

## Tasks Completed

| # | Task | Details |
|---|------|---------|
| 1 | Stripe Integration | Stripe SDK v20, webhook endpoint handling 5 event types, `subscriptions` and `payments` tables, customer creation on checkout |
| 2 | Checkout & Subscription Flow | Stripe Checkout Sessions, success page, Billing Portal for subscription management, middleware protection on `/checkout` |
| 3 | Pricing Page | 3-tier comparison cards (Free/Premium/Boost), feature comparison table, FAQ section, dynamic CTA buttons |
| 4 | Tier Limit Enforcement | Listing limits (3/15/50), photo limits (5/15/25), conversation limits (10/∞/∞), upgrade prompts on limit reach |
| 5 | Email Notifications | Resend integration, branded HTML templates (welcome, new message, listing inquiry, subscription confirmation), graceful skip when API key not set |
| 6 | About & Legal Pages | About page with mission/how-it-works/values/contact, Terms of Service (12 sections), Privacy Policy (10 sections), footer links updated |
| 7 | Admin Dashboard | `is_admin` column on profiles, admin server actions, stats overview, listing moderation (approve/remove), user management (ban/unban), signup/listing bar charts |
| 8 | Production Hardening | Zod v4 validation schemas, SEO metadata (Open Graph, Twitter, keywords), loading skeletons for 5 routes, rate limiting on webhook, 404 page polish with accessibility |

## Key Files Created/Modified

### Server Actions
- `src/app/actions/tier.ts` — `checkListingLimit()`, `checkConversationLimit()`, `checkPhotoLimit()`
- `src/app/actions/admin.ts` — `checkIsAdmin()`, `getAdminStats()`, `getAdminListings()`, `getAdminUsers()`, `adminUpdateListingStatus()`, `adminToggleUserBan()`, `getSignupsByMonth()`, `getListingsByMonth()`
- `src/app/(main)/checkout/actions.ts` — `createCheckoutSession()`, `createBillingPortalSession()`, `getSubscription()`

### Pages
- `src/app/(main)/checkout/page.tsx` — Stripe Checkout redirect
- `src/app/(main)/checkout/success/page.tsx` — Post-payment success
- `src/app/(main)/admin/page.tsx` — Admin dashboard
- `src/app/(marketing)/pricing/page.tsx` — Pricing comparison (rewritten)
- `src/app/(marketing)/about/page.tsx` — About page (rewritten)
- `src/app/(marketing)/terms/page.tsx` — Terms of Service
- `src/app/(marketing)/privacy/page.tsx` — Privacy Policy

### Infrastructure
- `src/lib/stripe.ts` — Stripe client (API version 2026-02-25.clover)
- `src/lib/email.ts` — Resend email client + branded templates
- `src/lib/rate-limit.ts` — In-memory rate limiter
- `src/lib/validations.ts` — Zod v4 schemas (listing, profile, message, contact)
- `src/app/api/webhooks/stripe/route.ts` — Stripe webhook handler

### Database
- `supabase/migrations/004_monetization.sql` — subscriptions, payments tables, stripe_customer_id + email_notifications on profiles
- `supabase/migrations/005_admin_role.sql` — is_admin column + partial index

### Loading Skeletons
- `src/app/(main)/dashboard/loading.tsx`
- `src/app/(main)/search/loading.tsx`
- `src/app/(main)/messages/loading.tsx`
- `src/app/(main)/favorites/loading.tsx`
- `src/app/(main)/profile/loading.tsx`

## Stripe Configuration
- Products: Premium (`prod_U3yPLNhgGBBSNz`), Boost (`prod_U3yQ5lacF9OWOT`)
- Prices: Premium (`price_1T5qSuK0aD0I9hZISnkpcF3E` — $29.99/mo), Boost (`price_1T5qTBK0aD0I9hZIYYNtRrBt` — $79.99/mo)
- Webhook: `we_1T5qXQK0aD0I9hZIWYWI24gA`
- SDK: Stripe v20.4.0, API version `2026-02-25.clover`

## Stripe v20 SDK Gotchas
- `current_period_start` / `current_period_end` moved to `subscription.items.data[0]`, not on top-level subscription
- `invoice.subscription` removed — use `invoice.parent?.subscription_details?.subscription`
- `invoice.payment_intent` removed — use `stripe_invoice_id` for upsert conflict resolution

## Database (Current State)
8 tables: profiles, listings, listing_images, favorites, conversations, messages, subscriptions, payments
- `profiles.is_admin` — admin flag (Mark Mireles set as admin)
- `profiles.stripe_customer_id` — Stripe customer link
- `profiles.email_notifications` — JSON notification preferences
- Unique index on `payments.stripe_invoice_id` for upsert
