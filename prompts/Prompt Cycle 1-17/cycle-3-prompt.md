# Cycle 3 — Monetization, Polish & Production Readiness

## Context
Metal Gear is an industrial equipment marketplace for Houston, TX. Cycle 1 (Foundation) and Cycle 2 (Core Marketplace) are complete — see `prompts/cycle-2-complete.md` for details. The project uses Next.js 15, Supabase, Tailwind v4, shadcn/ui, Zustand, and TanStack Query. Read `CLAUDE.md` at the project root for full project context.

**Critical pattern:** All database operations MUST use server actions with admin client. Client-side Supabase DB/storage calls hang in production. See `prompts/cycle-2-complete.md` for details.

## Credentials Needed
At the start of this session, I'll need:
- **Vercel token** (for deployments)
- **Stripe secret key + publishable key** (for payment processing)
- **Supabase Management API token** (if schema changes needed)

## Cycle 3 Tasks

### Task 1: Stripe Integration & Payment Infrastructure
- Install Stripe packages (`stripe`, `@stripe/stripe-js`)
- Set up Stripe env vars in Vercel
- Create Stripe webhook endpoint at `/api/webhooks/stripe`
- Create database tables: `subscriptions`, `payments` (replace placeholder migration 004)
- Stripe Customer creation on user signup (or first checkout)
- Handle webhook events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`

### Task 2: Checkout & Subscription Flow
- Create Stripe Products & Prices for Premium ($29.99/mo) and Boost ($79.99/mo)
- Checkout page at `/checkout` using Stripe Checkout Sessions
- Success/cancel redirect pages
- Update `subscription_tier` in profiles table on successful payment
- Subscription management: view current plan, cancel, change plan
- Add billing portal link for invoice/payment method management

### Task 3: Pricing Page
- Build full pricing page at `/pricing` with tier comparison cards
- Feature comparison table (listings, photos, videos, conversations, search radius)
- Highlight recommended plan
- CTA buttons linking to checkout flow
- FAQ section answering common questions
- Mobile-responsive card layout

### Task 4: Tier Limit Enforcement
- Enforce listing count limits on create (free: 3, premium: 15, boost: 50)
- Enforce photo count limits per listing (free: 5, premium: 15, boost: 25)
- Enforce conversation limits (free: 10, premium+boost: unlimited)
- Show upgrade prompts when limits are reached instead of silent blocking
- Add tier badge to user's listings and profile

### Task 5: Email Notifications
- Set up transactional email via Supabase Auth email templates or Resend
- New message notification (when user receives a message while offline)
- Listing inquiry notification (when someone contacts seller about a listing)
- Subscription confirmation/cancellation emails
- Welcome email on signup
- Respect notification preferences (add to profile settings)

### Task 6: About & Legal Pages
- About page (`/about`) with company mission, value proposition, how it works
- Terms of Service page (`/terms`)
- Privacy Policy page (`/privacy`)
- Footer links to all legal/info pages
- Contact/support section with email

### Task 7: Admin Dashboard
- Admin role check (add `is_admin` to profiles or use Supabase custom claims)
- Admin route at `/admin` with middleware protection
- Overview: total users, total listings, active listings, revenue metrics
- Listing moderation: review flagged listings, approve/remove
- User management: view users, ban/unban
- Basic analytics charts (listings created over time, signups over time)

### Task 8: Production Hardening
- Rate limiting on API routes and server actions
- Input validation/sanitization on all forms (zod schemas)
- Image optimization for listing photos (resize on upload)
- SEO: meta tags, Open Graph images, structured data for listings
- 404 and error page polish
- Loading skeletons for all data-fetching pages
- Accessibility audit (focus states, ARIA labels, keyboard nav)

## Design Guidelines
- Dark theme only (#0A0A0F bg, #FF6B2B primary, #3A8FD4 accent)
- Chakra Petch for headings, Manrope for body
- Mobile-first responsive (Mobile < 768px, Tablet 768-1023px, Desktop 1024px+)
- Use existing shadcn/ui components; install new ones as needed
- All DB operations via server actions (never client-side Supabase for DB/storage)

## Workflow
- Do each task sequentially
- Build, commit, push, and deploy after each task
- Troubleshoot errors autonomously — I'll provide credentials upfront
