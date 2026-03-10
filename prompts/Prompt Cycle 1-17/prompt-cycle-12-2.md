# Cycle 12 — Prompt 2: Financial Dashboard, Analytics & System Settings
## Metal Gear · Industrial Equipment Marketplace

---

## Context

You are completing the Metal Gear Super Admin Dashboard. Prompts 11-1, 11-2, and 12-1 built the shell, user/listing/SOS management, and Priority Engine. This final admin prompt adds the **Financial Dashboard**, **Analytics panel**, and **System Settings**. After this prompt the Super Admin system is feature-complete.

---

## Deliverables

### 1. Financial Dashboard — `/admin/financials`

**Access:** superadmin + analyst only

All data pulled from Stripe via server actions (use Stripe API, not just local DB). Cache aggressively with `unstable_cache` — 15-minute TTL.

**Top KPI strip:**
```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│  $12.4K  │ │  $148K   │ │  $3,200  │ │  94.2%   │ │  $8.40   │ │  2.3%    │
│  MRR     │ │  ARR     │ │  Boosts  │ │ Retention│ │  ARPU    │ │  Churn   │
│  (est.)  │ │  (est.)  │ │  revenue │ │  rate    │ │          │ │  rate    │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

**Revenue breakdown chart (last 12 months, bar chart):**
- Stacked bars: Subscription revenue (Free→Premium upgrades, Boost upgrades) + Boost store revenue
- Hover tooltip: breakdown per month

**Subscription distribution (donut chart):**
- Free / Premium / Boost counts and percentages
- Delta vs last month (↑↓ indicators)

**Subscription table (paginated):**

Columns: User | Plan | Amount | Billing cycle | Status | Started | Next billing | Stripe ID | Actions

Filters: Plan / Status (active, past_due, cancelled, trialing) / Date range

Row actions:
- View in Stripe dashboard (external link)
- Cancel subscription
- Apply discount (create Stripe coupon and attach)
- Extend trial
- Refund last payment

**Boost Revenue table:**

Separate table showing all `boost_purchases` with revenue:
- Columns: User | Boost type | Listing | Amount | Duration | Purchased | Expires | Status
- Totals row at bottom
- CSV export button

**Disputed / Failed Payments:**
- Table of Stripe PaymentIntents with status `requires_action` or `payment_failed`
- Manual retry button
- Contact customer button (opens draft email)

**Revenue forecast widget:**
- Simple projection: current MRR × 12 = ARR estimate
- "If churn stays at X%, projected 90-day MRR: $Y"
- Not AI-generated — simple arithmetic displayed cleanly

**CSV Export (all financial data):**
- "Export this month" and "Export custom range" buttons
- Generates: subscriptions.csv and boosts.csv
- Server action streams the file as a download

### 2. Analytics Panel — `/admin/analytics`

**Access:** all admin roles

This is platform health from a growth perspective, not financial.

**User growth chart (line, last 90 days):**
- New signups per day
- DAU (daily active users — proxy: users who performed any action)
- Cumulative users

**Listing health:**
- Listings posted per day (line chart)
- Average listing age before sold/expired
- Category distribution pie chart (which categories have the most listings)
- "Dead categories" — subcategories with 0 listings (taxonomy gaps for SOS)

**SOS Performance:**
- SOS broadcasts per day
- Average response time (first response to SOS)
- Fulfillment rate (% of SOSs marked fulfilled)
- "No match" rate per subcategory (useful for finding where to recruit more sellers)
- Top 10 most-requested equipment (subcategories with most SOSs)

**Search Analytics:**
- Top 20 search terms (from search history / `saved_searches`)
- Top 20 searches with 0 results (critical gap analysis)
- Filter: date range

**AI Assist Usage:**
- Listings created with AI assist vs without (from `ai_assist_used` column)
- AI assist acceptance rate (`ai_assist_accepted`)
- AI fraud flags: flagged count, false positive rate (cleared by admin), confirmed fraud rate

**Geographic distribution:**
- Map (Leaflet) with dots for each user location (PostGIS query — approximate, city-level)
- Density heatmap for listing locations
- Top 10 cities by user count

**Export:** all charts have "Export data as CSV" button

### 3. System Settings — `/admin/settings`

**Access:** superadmin only

**Section A — Platform Configuration:**

Key-value settings stored in a new `system_config` table:
```sql
CREATE TABLE system_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES profiles(id),
  updated_at timestamptz DEFAULT now()
);
```

Settings managed here:

| Setting | Type | Default | Description |
|---|---|---|---|
| `maintenance_mode` | boolean | false | Shows maintenance banner sitewide |
| `new_registrations_enabled` | boolean | true | Allow new signups |
| `listing_auto_approve` | boolean | false | Approve listings without review (for trusted sellers) |
| `sos_enabled` | boolean | true | Enable/disable SOS system globally |
| `boost_store_enabled` | boolean | true | Enable/disable self-serve boosts |
| `free_trial_days` | number | 0 | Days of free Premium trial for new signups |
| `max_free_listings` | number | 3 | Override tier limit for Free users |
| `ai_fraud_threshold` | number | 0.7 | Confidence threshold for auto-flagging |
| `sitewide_banner` | string | "" | Optional sitewide announcement banner text |
| `sitewide_banner_type` | enum | "info" | "info" / "warning" / "critical" |

All changes to system_config write to `admin_audit_log`.

**Section B — Admin User Management:**

Table of all admin users:
- Columns: User | Role | Granted by | Granted at | Last admin action
- Actions: Change role, Revoke admin access
- Add admin: search for any user by email → select role → grant

**Section C — Subscription Pricing:**

Display current Stripe product prices (fetched live from Stripe API). Read-only display with "Edit in Stripe →" link. This prevents accidental price changes but keeps admins informed.

**Section D — API & Integrations Status:**

Live status checks (ping each service on page load):
```
┌─────────────────────────────────────────────────────┐
│  Integration Status                                 │
│                                                     │
│  ✅ Supabase          Connected (latency: 12ms)     │
│  ✅ Stripe            Connected                     │
│  ✅ Anthropic API     Connected                     │
│  ✅ Resend (email)    Connected                     │
│  ✅ Sentry            Connected                     │
│  ⚠️  Sightengine      Not configured                │
│                                                     │
│  Apple SSO JWT expires: Aug 25, 2026 (173 days)    │
└─────────────────────────────────────────────────────┘
```

**Section E — Data Management:**

- "Run cleanup now" button (triggers the existing `/api/cron/cleanup` endpoint manually)
- "Run expired boosts check now" button (triggers boost expiry cron)
- Supabase storage usage display
- Database row counts per table (useful for monitoring growth)

**Section F — Audit Log Viewer:**

Full searchable audit log:
- Columns: Admin | Action | Target type | Target ID | Metadata | IP | Date
- Filters: admin user, action type, target type, date range
- Export as CSV
- Pagination (100 per page)

---

## CHANGELOG Update

After all of Cycles 10, 11, and 12 are complete, update `CHANGELOG.md`:

```markdown
## [1.0.0] — 2026-XX-XX · AI Vision, Super Admin & Priority Engine

### Added
- **AI-powered listing creation** — Claude Vision API analyzes equipment photos and nameplates; auto-populates title, manufacturer, model, serial, year, specs, and 3-tier taxonomy classification
- **Mobile camera capture** — native rear-camera input on iOS/Android in listing creation flow; client-side image compression; AI fraud detection on upload
- **Super Admin Dashboard** with 3-tier role system (superadmin / moderator / analyst)
- **Control Tower** — real-time platform stats, alert queue, activity feed, revenue/signup charts
- **Admin User Management** — full user dossier, impersonation, suspension/ban, role grants, admin notes
- **Admin Listing Management** — bulk actions, fraud queue, featured/pin controls, search boost scoring
- **SOS Monitor** — full SOS lifecycle visibility, routing debug tool, manual responder dispatch
- **Moderation Queue** — unified view of reports, AI fraud flags, review disputes
- **Self-serve Boost Store** — 5 boost types (Listing Featured, Category Pin, Homepage Slot, Storefront Featured, SOS Priority) with Stripe Checkout and daily expiry cron
- **Admin Priority Engine** — company priority tiers (Standard/Preferred/Featured/Platinum), homepage slot manager, category pin manager, free boost grants
- **Financial Dashboard** — MRR/ARR/churn KPIs, subscription table, boost revenue, Stripe dispute view, CSV exports
- **Analytics Panel** — user growth, listing health, SOS performance, search gaps, AI assist metrics, geographic map
- **System Settings** — platform config (maintenance mode, feature flags, banners), admin user management, integration status, audit log viewer

### Changed
- Search relevance now factors admin_boost score, company priority tier, and featured status
- Browse page shows featured carousel, pinned listings (📌), and featured seller widget
- Listing creation form adds AI-Assist as Step 0 with optional skip

### Database
- New tables: `boost_purchases`, `homepage_featured_slots`, `system_config`, expanded `admin_audit_log`
- New columns on `listings`: `is_featured`, `featured_until`, `admin_boost`, `pinned_position`, `pinned_category`, `admin_flag_reason`, `ai_analyzed`, `ai_fraud_flagged`, `ai_assist_used`, `ai_assist_accepted`, `specs`
- New columns on `profiles`: `admin_role`, `is_admin`, `priority_tier`, `priority_score`, `admin_notes`
- New enum values: `listing_status.pending_review`, `listing_status.flagged`, `admin_role`, `company_priority_tier`
```

---

## Final Commit & Deploy
- Commit: `feat: financial dashboard, analytics, system settings — super admin complete`
- Update CHANGELOG.md with full Cycles 10–12 entry
- Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
- Push + Vercel deploy
