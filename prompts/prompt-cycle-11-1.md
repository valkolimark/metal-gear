# Cycle 11 — Prompt 1: Super Admin Dashboard Shell + Role-Based Access Control
## Metal Gear · Industrial Equipment Marketplace

---

## Context

You are continuing development of Metal Gear. The app has an existing `/admin` route with basic stats, listing moderation, and user management. This cycle completely replaces and expands it with a full Super Admin system. Review `CLAUDE.md` and `CHANGELOG.md` before starting.

---

## Goal

Build the Super Admin infrastructure: role system, protected layout, navigation shell, and the first two panels — **Control Tower** (live platform overview) and **User Management** (full user control).

---

## Deliverables

### 1. Admin Role System

**Database:**
```sql
CREATE TYPE admin_role AS ENUM ('superadmin', 'moderator', 'analyst');

ALTER TABLE profiles
  ADD COLUMN admin_role admin_role,
  ADD COLUMN is_admin boolean DEFAULT false,
  ADD COLUMN admin_granted_at timestamptz,
  ADD COLUMN admin_granted_by uuid REFERENCES profiles(id);

CREATE TABLE admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES profiles(id) NOT NULL,
  action text NOT NULL,
  target_type text, -- 'user' | 'listing' | 'sos' | 'company' | 'system'
  target_id text,
  metadata jsonb DEFAULT '{}',
  ip_address inet,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_log_admin ON admin_audit_log(admin_id, created_at DESC);
CREATE INDEX idx_audit_log_target ON admin_audit_log(target_type, target_id);
```

**Role permissions matrix:**

| Permission | superadmin | moderator | analyst |
|---|---|---|---|
| View all data | ✅ | ✅ | ✅ |
| Moderate listings/users | ✅ | ✅ | ❌ |
| Set priority/boosts | ✅ | ❌ | ❌ |
| Manage subscriptions | ✅ | ❌ | ❌ |
| Grant/revoke admin roles | ✅ | ❌ | ❌ |
| View financial data | ✅ | ❌ | ✅ |
| Export data (CSV) | ✅ | ✅ | ✅ |
| Impersonate users | ✅ | ❌ | ❌ |

**Server-side permission helper — `src/lib/admin/permissions.ts`:**
```typescript
export type AdminRole = 'superadmin' | 'moderator' | 'analyst';
export type AdminPermission = 
  | 'moderate' | 'set_priority' | 'manage_subscriptions' 
  | 'grant_roles' | 'view_financials' | 'export_data' | 'impersonate';

export function hasPermission(role: AdminRole, permission: AdminPermission): boolean

export async function requireAdmin(
  supabase: SupabaseClient, 
  permission?: AdminPermission
): Promise<{ user: User; profile: Profile & { admin_role: AdminRole } }>
// Throws redirect to /dashboard if not admin or lacks permission
```

**`requireAdmin` must be called at the top of every admin server action and page.**

### 2. Admin Layout — `src/app/(admin)/layout.tsx`

New route group `(admin)` separate from `(main)`:

**Sidebar navigation:**
```
⚙️  METAL GEAR ADMIN
━━━━━━━━━━━━━━━━━━━
🏠  Control Tower
👥  Users
📦  Listings
🆘  SOS Monitor
⭐  Priority Engine     ← superadmin only (hidden for others)
🛡️  Moderation Queue
💰  Financials          ← superadmin + analyst only
📊  Analytics
🔧  System Settings     ← superadmin only
━━━━━━━━━━━━━━━━━━━
👤  [Admin name]
    [Role badge]
    [Sign out]
```

- Dark sidebar: `#0D0D14` background, `#FF6B2B` active indicator
- Role badge colors: superadmin = gold, moderator = blue, analyst = green
- Collapsed sidebar on mobile (hamburger)
- Breadcrumb header on all pages
- All sidebar links check permissions client-side (server checks are authoritative)

**Route group structure:**
```
src/app/(admin)/
  layout.tsx
  admin/
    page.tsx                    → Control Tower (redirect from /admin)
    users/
      page.tsx
      [id]/page.tsx
    listings/
      page.tsx
      [id]/page.tsx
    sos/
      page.tsx
    priority/
      page.tsx
    moderation/
      page.tsx
    financials/
      page.tsx
    analytics/
      page.tsx
    settings/
      page.tsx
```

### 3. Control Tower — `/admin` (page.tsx)

A real-time dashboard of platform health. All data via server actions.

**Top row — Live counters (auto-refresh every 30s via `setInterval` + server action):**
```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│  👥 247  │ │ 📦 1,482 │ │ 🆘  12  │ │ 💰 $8.4K │ │ 🚨  3   │
│  Online  │ │  Listings│ │ Active   │ │  MRR     │ │ Alerts  │
│  users   │ │  (live)  │ │  SOSs    │ │  today   │ │         │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

**Alert queue (top priority — shown prominently):**
- AI fraud-flagged listings awaiting review
- User reports (unresolved)
- Failed payments
- SOS requests open > 48 hours with no response
- Each alert: one-click action button ("Review", "Dismiss")

**Activity feed (last 50 events, real-time via Supabase Realtime):**
- New user registered
- New listing posted
- New SOS broadcast
- Subscription purchased/cancelled
- Dispute opened
- Admin action taken (from audit log)

**Charts (last 30 days using recharts or a simple SVG chart — no external chart library needed):**
- New signups per day (line chart)
- Listings posted per day (line chart)
- Revenue per day (bar chart)

**Today's snapshot:**
- New signups today / this week / this month
- Listings posted today
- SOS broadcasts today
- Subscriptions activated today

### 4. User Management — `/admin/users`

**User table (server-side paginated, 50 per page):**

Columns: Avatar | Name | Email | Role (badge) | Subscription tier | Listings | Joined | Last active | Status | Actions

**Filters (URL query params):**
- Search: name or email
- Subscription tier: all / free / premium / boost
- Status: all / active / suspended / banned
- Admin role: all / non-admin / moderator / analyst / superadmin
- Join date range

**Row actions (dropdown menu per user):**
- View profile (opens detail page)
- View as user (impersonate) — superadmin only
- Send direct message
- Upgrade/downgrade subscription — superadmin only
- Grant/revoke admin role — superadmin only
- Suspend account (24h / 7d / 30d / permanent)
- Ban account
- Reset password (send reset email)
- Delete account — superadmin only, confirmation required

**User detail page — `/admin/users/[id]`:**

Full user dossier:
- Profile info + avatar
- All listings (with quick approve/reject/feature)
- All SOS requests
- Subscription history
- Payment history
- Message thread count
- Review history (given and received)
- Reports filed against this user
- Admin action history (from audit_log)
- Active sessions
- Action panel (all row actions from table, plus notes field for admins to leave internal notes)

Add `admin_notes` text column to profiles table.

**Every action must:**
1. Call `requireAdmin(supabase, permission)` in the server action
2. Write a row to `admin_audit_log` with action, target_id, metadata (before/after state), and IP

---

## Navigation Update
Remove the old basic `/admin` route. Redirect `/admin` → `/admin` in the new `(admin)` group.

---

## Commit & Deploy
- Commit: `feat: super admin shell with RBAC, control tower, and user management`
- Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
- Push + Vercel deploy

---

## Next Prompt
Prompt 11-2 adds Listing Management and the SOS Monitor panels to the admin dashboard.
