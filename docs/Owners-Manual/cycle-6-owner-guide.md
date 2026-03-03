# Metal Gear — Cycle 6 Owner Guide
## Enhanced Onboarding & SOS Broadcast System

**Release Date:** March 2, 2026
**Production URL:** https://metal-gear-five.vercel.app

---

## Table of Contents

1. [What Changed](#what-changed)
2. [New User Onboarding Wizard](#new-user-onboarding-wizard)
3. [SOS Broadcast System](#sos-broadcast-system)
4. [Subscription Tier Limits](#subscription-tier-limits)
5. [Navigation Changes](#navigation-changes)
6. [Notification System Updates](#notification-system-updates)
7. [Equipment Categories Reference](#equipment-categories-reference)
8. [Technical Notes for Admins](#technical-notes-for-admins)

---

## What Changed

This release adds two major features:

1. **Enhanced Onboarding Wizard** — Every new user (and existing users who haven't completed it) will be guided through a 6-step setup that collects their business identity, equipment interests, industry context, trading goals, privacy preferences, and SOS participation. This replaces the old simple checklist.

2. **SOS Broadcast System** — A panic-button feature that lets anyone on the platform broadcast an urgent equipment need to qualified suppliers. Responders who match the equipment category get notified instantly. The requester receives offers with pricing, lead time, and condition — all in real time.

**Key behavior change:** All authenticated users who have not completed the new onboarding wizard will be automatically redirected to `/onboarding` when they try to access any protected page (dashboard, listings, messages, search, SOS, profile, etc.). They cannot bypass this — they must complete all 6 steps.

---

## New User Onboarding Wizard

### How It Works

When a user signs up (or logs in for the first time after this release), they land on the onboarding wizard at `/onboarding`. A progress bar at the top shows "Step X of 6" with segment indicators. The user can go back and forth between steps, and progress is saved automatically on each "Continue" click — if they close the browser and come back later, they resume exactly where they left off.

### Step 1 — Tell Us About Yourself (Identity)

This screen collects the user's business identity.

| Field | Required? | Notes |
|---|---|---|
| Full Name | No | Pre-filled from their signup info |
| Company Name | **Yes** | Cannot proceed without this |
| Job Title | No | Free text (e.g., "Plant Manager", "Procurement") |
| Work Email | No | Pre-filled from their login email, cannot be edited |
| Work Phone | No | Optional, with a visibility dropdown |
| Phone Visible To | No | "Everyone" / "People I've messaged" / "No one" (default: No one) |
| Primary Role | **Yes** | Must select one of the 6 role cards |
| Secondary Roles | No | Appears after selecting primary role |

**The 6 roles are:**
- **End User / Plant** — Plant manager, maintenance, engineering, procurement
- **Dealer / Broker** — Equipment dealer, surplus broker, distributor
- **Rebuilder / Repair Shop** — Equipment rebuilding, refurbishment, repair services
- **Scrap / Investment Recovery** — Scrap buyer, investment recovery, asset disposition
- **Logistics / Trucking** — Heavy haul, rigging, freight, equipment moving
- **Services** — Hydraulic, valve, spring, seal, and other specialty services

These roles map directly to the personas David described — plant managers, dealers, rebuilders, scrap, trucking, and specialty services.

### Step 2 — Equipment Interests

This is the "separating wheat from chaff" screen. It powers what shows up in a user's SOS feed and determines who gets pinged when someone sends an SOS.

- Users see a list of 13 equipment category cards (Centrifuges, Valves, Gearboxes, Mixers, Hydraulics, Scrap, Trucks, Bearings, CNC, Pumps, Heat Exchangers, Compressors, Other)
- A search bar at the top lets them quickly find categories
- Tapping a category selects it and expands sub-type chips (e.g., selecting "Valves" shows: Fisher control, Ball, Gate, Butterfly, Check, Globe, Plug)
- They can also enter brands they commonly work with (comma-separated)
- **At least one category must be selected** to proceed
- A summary bar at the bottom shows all selected categories as removable chips

### Step 3 — Industry & Pain Points

| Field | Required? | Notes |
|---|---|---|
| Industry | **Yes** | Must select at least one. 15 options available |
| Pain Points | No | Multi-select checkboxes |
| Other Pain Points | No | Free text for anything not listed |

**Industries available:** Food & Beverage, Pharmaceutical, Oil & Gas, Mining, Chemical, Maritime, Agriculture, Packaging, Power Generation, Water/Wastewater, Pulp & Paper, Aerospace, Manufacturing, Construction, Other

**Pain points:** Unplanned downtime, Hard-to-find spare parts, Finding trusted rebuilders, Reliable scrap buyers, Logistics/shipping

### Step 4 — What Brings You Here? (Trading Intent)

Users select what they want to do on Metal Gear:
- Find equipment / parts
- Sell surplus equipment / scrap / byproducts
- Find rebuilders / repair services
- Find buyers for rebuilt gear
- Arrange logistics / trucking

**Role-specific follow-up:** If the user selected "End User / Plant" as their primary role in Step 1, they see an additional section: "What do you most urgently need help with?" with options for Spare parts, Emergency breakdowns, Disposing of boneyard equipment, and Finding rebuilders.

### Step 5 — Visibility & SOS

This screen has two sections:

**Profile Visibility:**
- Show company name (default: ON)
- Show name & title (default: ON)
- Email visible to: Everyone / People I've messaged / No one (default: People I've messaged)

**SOS Responder Opt-In** (highlighted in an orange-bordered card):
- Toggle: "I can help when others hit SOS" (default: OFF)
- When turned ON, reveals:
  - **SOS categories** — pre-populated from their Step 2 equipment selections. They tap which ones they want to be pinged for.
  - **Urgency level** — "Normal + Emergency" (default) or "Only critical/emergency"
  - **Notification methods** — In-app (default on), Email, SMS (multi-select)
  - **Allow real-time contact** — toggle for text/call during SOS (default: OFF)

This is the setting that determines whether a user receives SOS notifications. If they toggle this ON and select "Valves," they will get pinged whenever someone sends an SOS for valves.

### Step 6 — Quality Commitment

Four checkboxes that **ALL must be checked** before the "Complete Setup" button activates:

1. "I will only list equipment I actually control"
2. "I will update or remove old / sold items promptly"
3. "Low-quality photos or incorrect info may be rejected"
4. "Repeated false listings can result in suspension"

A footer note reads: *"We want Metal Gear to be the most trusted B2B industrial marketplace — no phantom inventory, no junkyard vibes."*

Clicking **Complete Setup** saves everything, marks onboarding as complete, shows a "Welcome to Metal Gear!" toast, and redirects to the dashboard. The user will never see the onboarding wizard again.

---

## SOS Broadcast System

### The Concept

A plant manager's machine breaks down. They need a Fisher control valve NOW. Instead of calling 20 dealers, they hit the SOS button on Metal Gear. The system finds every dealer, rebuilder, and scrap yard on the platform who deals in valves, pings them all, and responses start flowing in with pricing, lead time, and condition. The plant manager picks the best one. Done.

### How to Send an SOS

1. **Tap the pulsing red SOS button** — It's always visible in the bottom-right corner of every page (above the mobile nav on phones, fixed position on desktop). It pulses with an animated red/orange glow to draw attention.

2. **Fill out the SOS form** at `/sos/create` — 5 sections:

   **Section 1 — What do you need?**
   - Pick an equipment category from the dropdown
   - Select a sub-type if applicable (e.g., "Fisher control" under Valves)
   - Enter brand and model (optional but helpful)
   - The title auto-generates (e.g., "Fisher Fisher control DVC6200") — editable
   - Add a description with details, specs, quantity

   **Section 2 — How urgent?**
   - **Critical / Emergency** (default) — "Plant is down, I need this NOW"
   - **Normal** — "Urgent but not a shutdown"

   **Section 3 — Attachments (optional)**
   - Upload up to 5 photos (JPEG, PNG, WebP)
   - Add notes

   **Section 4 — Location & Reach**
   - City and State (defaults to their profile location if blank)
   - Maximum distance: 100mi / 250mi / **500mi (default)** / Nationwide
   - Note: Free tier users are silently capped at 100mi even if they select a larger radius

   **Section 5 — Expiration**
   - 24 hours / 48 hours / **72 hours (default)** / 1 week
   - A live preview shows exactly what responders will see

3. **Hit "Send SOS"** — The system immediately:
   - Creates the SOS request
   - Runs the `find_sos_responders` function to find all users who opted in for that equipment category during onboarding
   - Sends each matching responder an in-app notification (with the red siren icon): *"SOS: [Company] needs a Fisher control valve — can you help?"*
   - Logs delivery to the `sos_notifications` table

### How to Respond to an SOS

1. **Get notified** — When someone sends an SOS in your equipment categories, you'll see a red-tinted notification in the bell icon dropdown. Tap it.

2. **Or browse the SOS dashboard** — Navigate to `/sos` via the nav. The dashboard shows all active SOS requests that match your equipment interests. Each card shows urgency, title, company name, category, location, time posted, and response count.

3. **Open an SOS** — Tap to see full details at `/sos/{id}`.

4. **Submit your response** — At the bottom of the page, fill out:
   - **Message** (required) — What you have, any relevant details
   - **Price estimate** (optional) — e.g., "$2,500"
   - **Lead time** (optional) — e.g., "Same day" or "3-5 business days"
   - **Condition** (optional) — New Surplus / Rebuilt / Used-Good / Used-Fair / As-Is

5. **Hit "Send Response"** — The requester gets notified instantly. Your response appears on their page in real time (no refresh needed — Supabase Realtime is active).

**Note:** You can only respond once per SOS. You cannot respond to your own SOS.

### Managing Your SOS (Requester View)

When you open your own SOS at `/sos/{id}`:
- You see all responses in real time as they come in
- Each response shows the responder's company name, message, price estimate, lead time, and condition
- You can **Accept & Mark Fulfilled** on any response — this:
  - Marks your SOS as fulfilled
  - Sends the responder a notification: "Your SOS response was accepted!"
  - Changes the SOS status from "Active" to "Fulfilled"
- You can **Message** any responder to open a conversation
- You can **Cancel SOS** if you no longer need help

### My SOS Requests

Navigate to `/sos/my-requests` to see all your past SOS requests with their status (Active / Fulfilled / Expired / Cancelled) and response counts.

---

## Subscription Tier Limits

SOS limits are enforced per subscription tier:

| Feature | Free | Premium ($29.99/mo) | Boost ($79.99/mo) |
|---|---|---|---|
| Active SOS at once | 1 | 3 | Unlimited |
| Maximum reach | 100 miles | 500 miles | Nationwide |
| Responders notified | Up to 10 | Unlimited | Unlimited |

If a Free user tries to send a second SOS while one is still active, they'll see: *"You can have 1 active SOS request on your free plan. Upgrade for more."*

The reach limit is enforced silently — if a Free user selects "Nationwide," the system caps it to 100 miles on the backend.

---

## Navigation Changes

### Desktop (top nav bar)
The nav now includes **SOS** between Collections and Messages:
> Home | Browse Equipment | My Listings | Favorites | Collections | **SOS** | Messages | Profile

The SOS nav item appears in **red text** to stand out.

### Mobile (slide-out drawer)
The drawer now includes SOS:
> Home | Browse Equipment | My Listings | **SOS** | Messages | Profile

### Floating SOS Button
A pulsing red/orange circular button with a siren icon is visible on **every page** within the main app:
- **Mobile:** Bottom-right, positioned above the bottom navigation bar
- **Desktop:** Bottom-right corner, 24px from the edges
- Tapping it goes directly to `/sos/create`
- It has a pulsing animation ring to draw attention — this is intentional, it's meant to feel urgent

---

## Notification System Updates

Five new notification types have been added for SOS:

| Notification | When it fires | Who gets it |
|---|---|---|
| **SOS Request Match** | Someone sends an SOS in your category | All matching responders |
| **SOS Response Received** | Someone responds to your SOS | The requester |
| **SOS Response Accepted** | Your response to an SOS was accepted | The responder |
| **SOS Expired** | Your SOS expired after its time window | The requester |
| **SOS Fulfilled** | An SOS you responded to was fulfilled | Responders |

SOS notifications have **distinct visual treatment** in the notification dropdown:
- Red siren icon instead of the usual blue/yellow/green icons
- Unread SOS notifications have a red left border and red-tinted background (vs. the standard orange tint for other notifications)
- Tapping any SOS notification opens the relevant SOS detail page

---

## Equipment Categories Reference

These categories power both the onboarding equipment interest selection and the SOS routing. When a user selects categories during onboarding and opts in as an SOS responder, they'll be notified for SOS requests in those categories.

| Category | Sub-types |
|---|---|
| **Centrifuges** | Decanter, Lab, Disk-stack, Tubular, Basket |
| **Valves** | Fisher control, Ball, Gate, Butterfly, Check, Globe, Plug |
| **Gearboxes** | Helical, Planetary, Worm, Bevel, Parallel shaft |
| **Mixers / Blenders** | Ribbon, Sigma blade, Lab, Industrial, High-shear, Paddle |
| **Hydraulic Equipment** | Pumps, Cylinders, Motors, Power units, Accumulators |
| **Scrap & Byproducts** | Springs/coils, Nichrome wire, Stainless, Copper, Aluminum, Brass |
| **Trucks & Heavy Equipment** | Peterbilt, Trailers, Roll-off containers, Forklifts, Boom trucks |
| **Bearings & Seals** | Ball bearings, Roller bearings, Thrust bearings, Mechanical seals, O-rings |
| **CNC / Machine Tools** | Lathes, Mills, Grinders, EDM, Boring machines, Machining centers |
| **Pumps** | Centrifugal, Positive displacement, Diaphragm, Peristaltic, Gear, Screw |
| **Heat Exchangers** | Shell & tube, Plate, Air-cooled, Double pipe, Spiral |
| **Compressors** | Reciprocating, Screw, Centrifugal, Rotary vane, Scroll |
| **Other** | (free text) |

Each category also has a list of common brands that appear as placeholder text in the onboarding wizard, helping users identify what to enter.

---

## Technical Notes for Admins

### Database

5 new tables were created:
- `user_business_profiles` — Extended user profile data (business identity, roles, SOS settings, onboarding state)
- `user_equipment_interests` — Many-to-many: user's equipment category interests with sub-types and brands
- `sos_requests` — SOS broadcast records
- `sos_responses` — Responses from suppliers to SOS requests
- `sos_notifications` — Delivery log for SOS notifications (tracks in_app/email/sms delivery)

3 PostgreSQL functions:
- `find_sos_responders(category, sub_type)` — Returns matching users who opted in for SOS in that category
- `get_user_active_sos_count(user_id)` — Counts active SOS for tier limit enforcement
- `expire_old_sos_requests()` — Marks expired SOS as expired (should be called periodically via cron or Supabase scheduled function)

### Storage

A new `sos-media` storage bucket was created for SOS photo/video uploads:
- Private (not public)
- 50MB file size limit
- Accepts: JPEG, PNG, WebP images and MP4/QuickTime video

### Real-time

The `sos_responses` and `sos_requests` tables are added to the Supabase Realtime publication. The SOS detail page subscribes to real-time changes on `sos_responses` filtered by the current SOS ID, so new responses appear live without refreshing.

### Onboarding Guard

The middleware at `src/lib/supabase/middleware.ts` checks `user_business_profiles.onboarding_completed` on every protected route access. If a user hasn't completed onboarding, they are redirected to `/onboarding`. The following paths are exempt:
- `/onboarding` itself
- `/api/*` routes
- `/callback` (auth callback)
- Auth routes (`/login`, `/signup`, `/forgot-password`)
- Marketing pages (`/pricing`, `/about`, `/terms`, `/privacy`)

### SOS Expiration

SOS requests have an `expires_at` timestamp. The `expire_old_sos_requests()` function updates status to `expired` for any active SOS past its expiration. **This function is not yet called automatically** — it should be set up as a Supabase cron job (pg_cron) or called periodically from an API route.

---

*This document covers the Cycle 6 release. For questions about the codebase, see `CLAUDE.md` at the project root.*
