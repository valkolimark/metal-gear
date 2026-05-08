# Session — 2026-05-08 — Cycle 67 (Cinematic Landing)

## Outcome
Shipped Cycle 67 (`[4.38.0]`). Replaced the marketplace homepage with the
cinematic landing from `design_handoff_homepage/`. Brand pivot: Metal Gear
positions as the trust layer for verified industrial rebuilders, with the 24/7
SOS lifeline as the headline value prop.

## Files added
- `src/components/landing/types.ts` — `LandingTickerItem`, `LandingFeaturedShop`, `LandingStat`, `LandingNetworkSummary`.
- `src/components/landing/data.ts` — design fallback fixtures (`LANDING_TESTIMONIAL`, `LANDING_FALLBACK_SHOPS`, `LANDING_FALLBACK_TICKER`, `SHOP_GRADIENTS`).
- `src/components/landing/icons.tsx` — hand-rolled SVG icons (`SirenIcon`, `CornerBrackets`, `HamburgerIcon`, `ArrowRightThin`).
- `src/components/landing/shared.tsx` — primitives: `Spec`, `StencilLabel`, `TickerRow`, `StatsStrip`, `FeaturedShopCard`, `SectionHead`, `LandingNav`, `LandingFooter`, `CautionStripe`, `AudienceChip`, `MonoLink`.
- `src/components/landing/LandingDesktop.tsx` — full desktop layout (CinematicHero + SOS feature + featured rebuilders + stats + closing CTA).
- `src/components/landing/LandingMobile.tsx` — mobile layout per the handoff (in-hero floating wordmark + ghost hamburger + stacked CTAs at bottom of photo).
- `src/app/actions/landing.ts` — `getLandingNetworkSummary`, `getLandingFeaturedShops`, `getLandingTicker`, `getLandingStats`.
- `public/landing/hero-rotor.webp` — 294 KB hero photo (replace with licensed equivalent before launch).
- `prompts/session-2026-05-08-cycle-67.md` — this file.

## Files modified
- `src/app/page.tsx` — replaced marketplace homepage with cinematic landing.
- `src/app/layout.tsx` — added `jetbrainsMono.variable` to `<body>` className.
- `src/styles/fonts.ts` — added `JetBrains_Mono` import and export; bumped Manrope to include weight 800 for the 92px display headline.
- `src/app/globals.css` — added `mg-pulse` and `mg-sos-pulse` keyframes scoped to `[data-section="landing"]`.
- `CHANGELOG.md` — `[4.38.0]` entry with rationale.
- `CLAUDE.md` — new "Cinematic Landing (Cycle 67)" section above the tech stack.

## Decisions logged
- **Brand framing:** "rebuilders" stays a marketing label that resolves to `company_profiles` slugs. No new schema. A verified-rebuilder concept (badge / role flag / dedicated entity) is a future cycle's question.
- **Stats discipline:** I deliberately omitted the design's `$184M traded` / `< 4 hrs avg response` / `4,287 rebuilders` narrative numbers. The "NETWORK ONLINE" pill, stats strip, and `BROWSE ALL N` link all read live values from the DB. CLAUDE.md codifies the rule so future cycles don't re-introduce false metrics.
- **Featured rebuilders:** prefer real `company_profiles` rows over design fixtures even when the company has 0 active listings. Empty `Jobs` stat renders as `—`. Only fall back to fixtures when the table is genuinely empty.
- **SOS UI mock on the right of the SOS feature section** is intentionally static. Map / responder pins / claim list are visual fixtures — they don't pull live SOS rows. Wiring them up requires a routing model that doesn't exist yet (radius-based fan-out + ETA estimation).
- **No `MarketingHeader` / `Footer` on the homepage.** The cinematic surface ships its own `LandingNav` and `LandingFooter` per the design. Other marketing routes (`/about`, `/pricing`, etc.) keep the existing chrome.
- **No `WelcomeBackStrip` / `ProblemDiagnoser`.** Both fall outside the cinematic narrative; preserved for use elsewhere.

## Verification
- `npm run typecheck` ✅
- `npm run lint` (chains `check:archetypes`) ✅
- `npm run build` ✅ (98 pages, zero errors)
- `npm test` — 319 passed ✅
- Dev server smoke test on `http://localhost:3000/`:
  - HTTP 200, ~476 KB rendered HTML
  - `/landing/hero-rotor.webp` serves at 301,128 bytes
  - "NETWORK ONLINE · 3 STATES · 10 REBUILDERS" rendered with real DB counts
  - 26 `VERIFIED REBUILDER` stencil-label instances confirms both layouts rendered
  - `data-section="landing"` wrapper present, CSS vars (`--mg-accent` etc.) resolved

## Next steps post-deploy
1. Hit `/` on production — verify the cinematic landing renders for both desktop and mobile widths.
2. Confirm `/landing/hero-rotor.webp` serves from the CDN.
3. Confirm featured rebuilder cards link to `/companies/[slug]` and the slug pages still work.
4. Plan a follow-up to replace the hero photo with a properly licensed equivalent — visual brief in the design handoff README under "Assets".
