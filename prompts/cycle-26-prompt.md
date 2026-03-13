# Metal Gear — Cycle 26: Notifications, Sound Design & OS Theme Sync

## Context

Read `CLAUDE.md` and `CHANGELOG.md` before starting. This cycle handles engagement infrastructure: a distinctive notification sound, repeating cadence for high-priority alerts, OS theme auto-detection, and better user education on why notifications matter on this platform.

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

Four improvements to notification and theme experience:

1. Distinctive app notification sounds (two tiers: standard message, high-priority alert)
2. Repeating alert cadence for high-priority events until acknowledged
3. OS theme auto-detection (match dark/light to system preference, manual override preserved)
4. User education on notifications at opt-in moment

---

## Feature 1 — Notification Sounds

### Sound Design

Create two audio assets:

**Standard sound** (`/public/sounds/notification.mp3` + `.ogg`):
- Short, clean, metallic tone — 0.3–0.5 seconds
- Should feel industrial but not harsh — think a clean bell or a subtle machinery click
- Not annoying when it repeats throughout a workday
- Volume: moderate, not startling

**High-priority sound** (`/public/sounds/alert.mp3` + `.ogg`):
- More attention-grabbing — a 2-tone sequence or a low-frequency industrial pulse
- Distinct from standard — user should immediately know this is urgent without looking at their screen
- Still professional — this is a B2B platform, not a consumer app

**Generate these sounds programmatically** using the Web Audio API in a small script, or source royalty-free industrial/mechanical sound effects. If generating programmatically:

```javascript
// Example: generate a simple metallic notification tone
const ctx = new AudioContext()
const oscillator = ctx.createOscillator()
const gainNode = ctx.createGain()
oscillator.connect(gainNode)
gainNode.connect(ctx.destination)
oscillator.frequency.setValueAtTime(880, ctx.currentTime)          // A5
oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3) // A4
gainNode.gain.setValueAtTime(0.4, ctx.currentTime)
gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
oscillator.start(ctx.currentTime)
oscillator.stop(ctx.currentTime + 0.3)
```

Provide both as static files. Use `.ogg` as primary (smaller), `.mp3` as fallback.

### Triggering Sounds

**Standard sound triggers:**
- New message received (in any conversation)
- New SOS response received (seller responding to buyer's SOS)
- Saved search alert email delivered

**High-priority sound triggers:**
- New SOS broadcast matching user's equipment interests
- SOS with urgency level `critical` in user's categories
- A high-value offer received (offer > $10,000 — check offer amount)

**Implementation:** A lightweight `useNotificationSound()` hook that:
1. Preloads both audio files on mount using the `<audio>` element with `preload="auto"`
2. Exposes `playStandard()` and `playHighPriority()` methods
3. Respects browser autoplay policy — audio only plays in response to a user interaction that happened recently, OR via the Web Push notification path
4. Checks the user's sound preference before playing (see Feature 4)

Hook location: `src/hooks/use-notification-sound.ts`

Integrate with the existing Supabase Realtime subscription that handles new messages and notifications — find where new message events are received client-side and call `playStandard()` there.

### Sound Preference Setting

Add to user notification preferences:
- Notification sounds: On / Off (default: On)
- High-priority sounds: On / Off (default: On)

These settings live in the existing notification preferences UI. Store in the existing notification preferences structure (check where notification prefs are stored — likely `profiles` JSONB column or a dedicated table).

---

## Feature 2 — Repeating Alert Cadence for High-Priority Events

When a high-priority event arrives (new SOS in user's category, critical urgency SOS), if the user has not acknowledged it within 2 minutes, play the high-priority sound again. Repeat up to 3 times (so: immediate, +2min, +4min).

**Acknowledged = any of:**
- User taps the notification in the notification bell dropdown
- User navigates to the SOS dashboard
- User dismisses the alert explicitly

**Implementation:**
- Track unacknowledged high-priority notifications in a small client-side map (notification ID → timestamp)
- Use `setInterval` to check every 30 seconds; if a high-priority notification is > 2 minutes old and unacknowledged, play the sound again
- Maximum 3 plays per notification (prevent infinite loop)
- Clear the interval when user acknowledges or navigates away

Do not use push notifications for this repeat cadence — it's a foreground-only behavior while the app is open in the browser/PWA.

---

## Feature 3 — OS Theme Auto-Detection

**Current state:** `next-themes` is configured with `enableSystem` — this should already respect OS preference. Investigate whether it's actually working or if something is overriding it.

**Desired behavior:**
- Default mode: **Auto** — matches the user's OS dark/light preference
- User can override: **Light** or **Dark** manually
- Override is persisted in localStorage / cookie via `next-themes`
- If user has set an override, OS changes don't affect the app theme

**The ThemeToggle component** currently likely has two states (Light / Dark). Update it to three states:

```
Auto (system) → Light → Dark → Auto (system) → ...
```

Or render as a segmented control / three-button group:
```
[Auto]  [Light]  [Dark]
```

Show the current OS preference when Auto is selected: "Auto (currently dark)" or "Auto (currently light)".

**Placement:** ThemeToggle exists in the desktop header and the mobile menu drawer. Update both. The mobile menu drawer's ThemeToggle (at the bottom) should show the three-state control.

**`next-themes` config:**
```tsx
<ThemeProvider 
  attribute="class" 
  defaultTheme="system"   // ← change from "dark" to "system"
  enableSystem            // already set
  storageKey="metal-gear-theme"
>
```

---

## Feature 4 — Notification Opt-In Education

**Problem:** When the browser asks for notification permission, users often deny it because they don't understand why they'd want notifications from an equipment marketplace. On this platform, SOS alerts and urgent opportunities can be worth tens of thousands of dollars — users who opt in have a real advantage.

**Fix:** Before the browser permission prompt fires, show a Metal Gear-branded education modal that explains the value.

**Modal content:**

```
🔔 Don't miss urgent opportunities

Metal Gear members who enable notifications:
• Receive SOS alerts when someone urgently needs equipment you have
• Get first-response advantage on high-value requests
• See offer activity on your listings in real-time

High-value SOS requests (often $50K–$500K equipment needs) go to 
whoever responds first. Notifications are how you stay ahead.

[Enable Notifications]  [Not Now]
```

**Trigger:** Show this modal:
1. After a user completes onboarding for the first time (new users)
2. When a user clicks the notification bell for the first time and permission is `default` (not yet asked)
3. Never show it if permission is already `granted` or `denied`

**After "Enable Notifications":** Call `Notification.requestPermission()`. If granted, show a success state. If denied, show a brief message about how to re-enable from browser settings.

**After "Not Now":** Dismiss. Show a subtle persistent prompt in the notification bell dropdown: "Enable notifications to get real-time SOS alerts" with a small "Enable" link. This prompt disappears once permission is granted.

**Implementation:**
- New component: `NotificationEducationModal` 
- Store "has seen modal" in localStorage to prevent repeated showing
- The modal is a shadcn `Dialog` — already installed

---

## Files to Create/Modify

- `/public/sounds/notification.mp3` + `/public/sounds/notification.ogg` — standard sound
- `/public/sounds/alert.mp3` + `/public/sounds/alert.ogg` — high-priority sound
- `src/hooks/use-notification-sound.ts` — sound hook
- `src/components/theme-toggle.tsx` — three-state toggle
- `src/components/notification-education-modal.tsx` — new component
- Main layout or notification bell — integrate education modal trigger
- Realtime subscription handler — call sound hook on new events
- Notification preferences UI — add sound on/off toggles
- `next-themes` config in root layout — change defaultTheme to "system"

---

## Edge Cases & Validation

- Sound doesn't play on first load (browser autoplay policy): acceptable — sound only plays in response to real-time events that arrive while the user is active
- User has muted their device: sounds don't play (OS handles this) — notification still appears visually
- Multiple browser tabs open: sound plays once (the tab that received the Realtime event plays it — if multiple tabs are subscribed, they may all play; acceptable for now)
- OS theme changes while app is open with Auto mode: theme should update immediately via `next-themes` media query listener
- Notification permission denied: education modal shows browser instructions; don't show the modal again
- Sound files not loaded yet when event arrives: handle gracefully, don't error

---

## Success Criteria

- [ ] Standard notification sound plays on new message received
- [ ] High-priority sound plays on new SOS in user's categories
- [ ] High-priority sound repeats up to 3× if alert unacknowledged, 2 min apart
- [ ] Sound preference (on/off) respected — no sound when user has disabled it
- [ ] ThemeToggle shows three states: Auto / Light / Dark
- [ ] Auto mode matches OS preference in real-time
- [ ] Manual override (Light or Dark) persists across sessions
- [ ] Notification education modal appears for new users post-onboarding
- [ ] Modal does not appear if permission already granted or denied
- [ ] "Not Now" path shows persistent subtle prompt in notification bell
- [ ] No TypeScript errors, no console errors
- [ ] Deployed and verified on mobile and desktop

---

## After Completing This Cycle

1. Update `CHANGELOG.md` with a `[3.7.0]` entry
2. Update `README.md` — document sound assets, three-state theme toggle, notification education flow
3. Update `CLAUDE.md` — document sound hook, notification modal, theme defaultTheme change
4. Deploy and verify

---

## Commit Message

```
feat(cycle-26): notification sounds, repeating alerts, OS theme sync

- Standard and high-priority notification sounds (industrial tone design)
- High-priority alerts repeat up to 3x if unacknowledged (2min cadence)
- Sound on/off preference in notification settings
- ThemeToggle: three-state Auto/Light/Dark (Auto matches OS preference)
- Notification education modal for new users post-onboarding
- Persistent notification opt-in nudge in bell dropdown for undecided users

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
