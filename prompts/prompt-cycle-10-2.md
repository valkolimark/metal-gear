# Cycle 10 — Prompt 2: Mobile Camera UI & Listing Form Integration
## Metal Gear · Industrial Equipment Marketplace

---

## Context

You are continuing development of Metal Gear. Prompt 10-1 built `/api/listings/analyze-image`. Now wire it into the listing creation flow with a polished mobile-first camera capture experience.

---

## Goal

Add an "AI-Assist" step to the listing creation form that lets users photograph their equipment (or upload images) and have the form fields auto-populated via the Claude Vision API built in Prompt 10-1.

---

## Deliverables

### 1. New Component — `src/components/listings/AIImageCapture.tsx`

This is a self-contained multi-step capture widget that fits inside the existing listing creation form flow.

**Step 1 — Mode selection:**
```
┌─────────────────────────────────────────┐
│  📷  Let AI fill in your listing        │
│                                         │
│  [Take photos with camera]              │
│  [Upload from device]                   │
│  [Skip — I'll fill it in myself]        │
└─────────────────────────────────────────┘
```

**Step 2 — Capture/upload (two slots):**
```
┌──────────────────┐  ┌──────────────────┐
│                  │  │                  │
│   Wide Shot      │  │   Nameplate      │
│   (required)     │  │   (optional)     │
│                  │  │                  │
│  [📷 Camera]     │  │  [📷 Camera]     │
│  [📁 Upload]     │  │  [📁 Upload]     │
└──────────────────┘  └──────────────────┘
        ↓
  [Analyze Equipment →]
```

**Camera implementation:**
- Use `<input type="file" accept="image/*" capture="environment" />` — native rear camera on mobile, file picker on desktop
- Show image preview thumbnail once captured
- Convert to base64 client-side using `FileReader` before sending to API
- Compress images client-side before upload: max 1200px wide, quality 0.85 using canvas API — keeps payload under Vercel's 4.5MB body limit
- Show file size warning if image still exceeds 3MB after compression

**Step 3 — Processing state:**
```
┌─────────────────────────────────────────┐
│  🔍 Analyzing your equipment...         │
│                                         │
│  ████████████░░░░  Identifying type     │
│  ████████░░░░░░░░  Reading nameplate    │
│                                         │
│  This takes about 10–15 seconds         │
└─────────────────────────────────────────┘
```
- Animated progress bar (faked timer — 15s fill, resolves when API returns)
- Cannot cancel mid-analysis

**Step 4 — Results review:**
```
┌─────────────────────────────────────────┐
│  ✅ Equipment Identified                 │
│                                         │
│  Category: Process Equipment →          │
│            Centrifuges →                │
│            Decanter Centrifuges         │
│  Confidence: HIGH                       │
│                                         │
│  ─────────────────────────────────      │
│  Manufacturer  [Alfa Laval      ] ✏️    │
│  Model         [LYNX 300        ] ✏️    │
│  Serial #      [ALF-2019-48821  ] ✏️    │
│  Year          [2019            ] ✏️    │
│  Horsepower    [75 HP           ] ✏️    │
│  RPM           [3600            ] ✏️    │
│                                         │
│  ⚠️ 2 fields need review (low confidence)│
│                                         │
│  [← Retake]   [Apply to listing →]     │
└─────────────────────────────────────────┘
```
- All pre-filled fields are editable inline before applying
- Low-confidence fields highlighted in amber
- If `fraud.flagged === true`: show red banner "⚠️ Warning: This image may not be an authentic photo of real equipment. Please verify before listing."
- Alternatives section (collapsed by default): "AI also considered: [alt 1] [alt 2]"

**Props:**
```typescript
interface AIImageCaptureProps {
  onComplete: (data: AIAnalysisResult) => void;
  onSkip: () => void;
}
```

### 2. Integration into Listing Creation Form

The existing listing creation is a multi-step form. Insert the `AIImageCapture` component as **Step 0** (before the existing Step 1 — basic info):

- If user completes AI capture and clicks "Apply to listing →":
  - Pre-populate: title, manufacturer, model, serialNumber, year, condition, tier1, tier2, subcategory, and specs fields
  - User lands on Step 1 with fields already filled — they can edit anything
  - Show a subtle "✨ AI-filled" chip on each pre-populated field that dismisses on edit
  - The wide-shot image gets added to the listing's photo array automatically

- If user clicks "Skip": proceed to Step 1 with empty form as normal

### 3. Specs Field on Listing Form

Currently the listing form likely doesn't have a generic specs object. Add a dynamic key-value "Specifications" section to the listing creation form (Step 1 or Step 2 depending on form layout):

- Renders as a table of input pairs: `[Spec Name] [Value] [×]`
- "Add specification" button adds a new row
- Pre-populated by AI with extracted nameplate data
- Saved to `listings.specs` as JSONB

Add to listings table:
```sql
ALTER TABLE listings ADD COLUMN specs jsonb DEFAULT '{}';
```

### 4. Mobile UX Refinements

- On mobile (detect via `window.innerWidth < 768` or `useMediaQuery`), show camera as primary CTA (Upload as secondary)
- On desktop, show Upload as primary (Camera as secondary since webcams are rarely useful)
- After capture, show pinch-to-zoom preview of the nameplate image so user can verify it's readable before analysis
- Haptic feedback on mobile after successful analysis: `navigator.vibrate(200)` (where supported)

### 5. Loading & Error States

- Network timeout: if API takes >45s, show "Analysis is taking longer than expected. [Retry] [Skip]"
- API error: show "Couldn't analyze this image. [Try again] [Skip]" — never block the user
- Partial results (only wide shot analyzed): clearly show which fields were filled and which weren't

### 6. Analytics Tracking

Add to server action for listing creation — log AI assist usage:
```sql
-- In listings table
ADD COLUMN ai_assist_used boolean DEFAULT false,
ADD COLUMN ai_assist_accepted boolean DEFAULT false; -- did they click "Apply"?
```

---

## Style Notes (match Metal Gear design system)
- Background: `#0A0A0F`, primary: `#FF6B2B`, steel blue: `#3A8FD4`
- Use Chakra Petch for the "AI-Assist" heading
- Camera/upload slots: dashed border `border-2 border-dashed border-orange-500/30`, hover `border-orange-500`
- Progress bar: animated gradient from `#FF6B2B` to `#3A8FD4`
- Confidence chips: HIGH = green, MEDIUM = amber, LOW = red

---

## Commit & Deploy
- Commit: `feat: AI-powered mobile camera listing creation with Claude Vision`
- Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
- Push + Vercel deploy

---

## Next Prompt
Prompt 11-1 begins the Super Admin Dashboard shell with role-based access control.
