# Metal Gear — Cycle 17 · Listing Page Redesign + Mobile Swipe + AI Help + Public QR

## Critical Rules (always apply)
- All DB ops use server actions with `createAdminClient()` — never client-side Supabase calls
- Deploy via Vercel API curl, not CLI (git author mismatch)
- Commit co-author: `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
- Tailwind CSS v4 (CSS config — no `tailwind.config.ts`)
- Light/dark mode via `next-themes` — respect both themes in all new components

---

## Part 1 — Listing Detail Page: Amazon-Style Layout

### Objective
Replace the current Apple-esque two-column listing detail page with an Amazon-style three-region layout. Sticky right purchase panel that scrolls with the page until its content is exhausted, then the left/center content continues scrolling underneath it. Add an "Ask Metal Gear" AI chat section inline on the page.

### Files to Create/Modify

**Modify:**
- `src/app/(main)/listings/[id]/page.tsx` — full page rebuild

**Create:**
- `src/app/(main)/listings/[id]/components/ListingGallery.tsx`
- `src/app/(main)/listings/[id]/components/ListingPurchasePanel.tsx`
- `src/app/(main)/listings/[id]/components/ListingSpecs.tsx`
- `src/app/(main)/listings/[id]/components/AskMetalGear.tsx`
- `src/app/(main)/listings/[id]/components/ListingReviews.tsx`
- `src/app/api/listings/[id]/ask/route.ts`

### DB Changes
None. Ask Metal Gear is stateless — no persistence for session chat.

### Layout Architecture

Three-column desktop grid: gallery (fixed ~460px) | main content (flexible) | sticky sidebar (fixed 320px).

```tsx
<div className="max-w-[1400px] mx-auto px-4 py-6">
  {/* Breadcrumb */}

  <div className="grid grid-cols-1 lg:grid-cols-[460px_1fr_320px] gap-x-8 items-start">

    {/* Col 1: Gallery */}
    <div>
      <ListingGallery images={images} videos={videos} />
    </div>

    {/* Col 2: Main content */}
    <div className="min-w-0 space-y-10">
      <ListingMainContent listing={listing} seller={seller} />
      <ListingSpecs specs={listing.specs} conditionReport={conditionReport} />
      <AskMetalGear listing={listing} seller={seller} />
      <ListingReviews reviews={reviews} seller={seller} />
    </div>

    {/* Col 3: Sticky purchase panel */}
    <div className="hidden lg:block">
      <div className="sticky top-20 self-start">
        <ListingPurchasePanel
          listing={listing}
          seller={seller}
          currentUser={user}
        />
      </div>
    </div>

  </div>

  {/* Mobile: purchase panel full width below content */}
  <div className="lg:hidden mt-6">
    <ListingPurchasePanel listing={listing} seller={seller} currentUser={user} />
  </div>
</div>
```

**Key CSS for sticky behavior:** The parent grid uses `items-start`. The sidebar div has `position: sticky; top: 80px`. This means the sidebar sticks to the viewport top while scrolling, with the main content flowing past it. The sidebar stops sticking naturally when the parent grid container ends.

### Step 1 — ListingGallery Component

Desktop layout: vertical thumbnail strip on left (72×72px), large main image on right.

- Main image: `object-contain`, dark background, `aspect-square`, `rounded-xl overflow-hidden`
- Thumbnails: clicking swaps main image; active thumbnail has `border-[#FF6B2B]` border
- Arrow prev/next buttons overlaid on main image edges
- Image counter badge top-right: `3 / 8`
- Zoom on hover: `group-hover:scale-110` with `transition-transform duration-300` on main image, `overflow-hidden` on container, `cursor-zoom-in`
- Video thumbnails: show play icon overlay; clicking opens `VideoPlayer` in a dialog/lightbox

Mobile layout (below `lg:`): horizontal dot indicators below main image; no vertical strip. Swipe navigation (see Part 2).

```tsx
// Desktop gallery structure
<div className="flex gap-3">
  {/* Vertical thumbnail strip */}
  <div className="flex flex-col gap-2 w-[72px] shrink-0">
    {images.map((img, i) => (
      <button
        key={i}
        onClick={() => setActive(i)}
        className={`w-[72px] h-[72px] rounded-md overflow-hidden border-2 transition-colors
          ${active === i ? 'border-[#FF6B2B]' : 'border-transparent hover:border-zinc-600'}`}
      >
        <img src={img.url} className="w-full h-full object-cover" alt="" />
      </button>
    ))}
  </div>

  {/* Main image */}
  <div className="relative flex-1 aspect-square bg-zinc-950 rounded-xl overflow-hidden group cursor-zoom-in">
    <img
      src={images[active].url}
      className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110"
      alt={listing.title}
    />
    {/* Prev/Next arrows */}
    {/* Counter badge */}
  </div>
</div>
```

### Step 2 — ListingPurchasePanel Component

Bordered card design:

```
┌─────────────────────────────┐
│ $24,500                     │
│ ✓ In Stock · Houston, TX    │
├─────────────────────────────┤
│ Condition: Excellent (A)    │
│ ████████████ 92/100         │
├─────────────────────────────┤
│ [Make an Offer]   ← primary │
│ [Contact Seller]  ← secondary│
│ [♡ Save Listing]            │
├─────────────────────────────┤
│ 👤 TechCorp Industries      │
│ ★ 4.8 · Verified · Houston  │
│ Responds in ~2 hours        │
│ [View Storefront →]         │
├─────────────────────────────┤
│ 🔒 Buyer Protection         │
│ Stripe escrow · AI mediation│
└─────────────────────────────┘
```

Styling:
- Card: `border border-zinc-700/60 rounded-xl p-5 bg-zinc-900/80 dark:bg-zinc-900/80 bg-white/90`
- Price: `text-3xl font-bold font-display` (Chakra Petch)
- "Make an Offer": full-width, `bg-[#FF6B2B]` 
- "Contact Seller": full-width, outlined `border-[#3A8FD4] text-[#3A8FD4]`
- Save: ghost button with heart icon
- If viewing own listing: show "Edit Listing" + "View Analytics" instead of offer/contact
- If listing is sold/expired: show status badge, disable CTAs with explanation

**Anonymous user gating:** If `currentUser` is null, clicking "Make an Offer" or "Contact Seller" opens the `AnonInteractionGate` modal instead of the action (see Part 3).

### Step 3 — ListingSpecs Component

Amazon-style alternating-row specs table:

```tsx
<section>
  <h2 className="font-display text-xl font-semibold mb-4">Technical Specifications</h2>
  <div className="divide-y divide-zinc-800 rounded-lg overflow-hidden">
    {Object.entries(specs).map(([key, val], i) => (
      <div
        key={key}
        className={`flex py-3 px-3 text-sm ${
          i % 2 === 0 ? 'bg-zinc-900/40 dark:bg-zinc-900/40 bg-zinc-50' : ''
        }`}
      >
        <span className="w-48 shrink-0 text-zinc-400 font-medium">{key}</span>
        <span className="text-zinc-100 dark:text-zinc-100 text-zinc-800">{String(val)}</span>
      </div>
    ))}
  </div>
</section>
```

If no specs: hide section entirely — don't render an empty table.

If condition report exists, render below specs as a collapsible section:
- Grade badge: A (green), B (blue), C (yellow), D/F (red)
- Three score bars: Mechanical / Cosmetic / Electrical, each on a 1–10 scale with colored fill
- Hours, inspection date, inspector notes

### Step 4 — AskMetalGear Component

Positioned after specs, before reviews. Stateless chat — session only, no DB writes.

```
┌──────────────────────────────────────────────────────┐
│ ⚙ Ask Metal Gear                                     │
│   Get instant answers about this listing             │
├──────────────────────────────────────────────────────┤
│ Suggested questions (chips):                         │
│ [Is this compatible with my process?]                │
│ [How does pricing compare to market?]                │
│ [What's included in the sale?]                       │
│ [What condition issues should I know about?]         │
├──────────────────────────────────────────────────────┤
│ [Chat thread — grows here]                           │
├──────────────────────────────────────────────────────┤
│ [ Ask a question about this listing...    ] [Ask →]  │
└──────────────────────────────────────────────────────┘
```

**Behavior:**
- 4 suggested question chips on mount; clicking a chip populates input and auto-submits
- On submit: append user message to thread, POST to `/api/listings/[id]/ask` with streaming
- Stream Claude's response word-by-word into an AI message bubble using `response.body.getReader()`
- Typing indicator (3 animated dots) while streaming
- Thread container: `max-h-96 overflow-y-auto` with auto-scroll to bottom on new messages
- Abort in-flight streams with `AbortController` on component unmount

**Suggested questions** — dynamically generated by category. Map `listing.subcategory` to a preset question bank. Fallback to 4 generic questions if no match.

**Styling:**
- Section header: gear icon + "Ask Metal Gear" in Chakra Petch
- Chips: `border border-zinc-600 rounded-full px-4 py-1.5 text-sm hover:border-[#3A8FD4] hover:text-[#3A8FD4] transition-colors cursor-pointer`
- User messages: right-aligned, `bg-[#FF6B2B]/20 border border-[#FF6B2B]/30 rounded-xl px-4 py-2 text-sm`
- AI messages: left-aligned, `bg-zinc-800/60 border border-zinc-700 rounded-xl px-4 py-2 text-sm` with small ⚙ bot avatar
- Input: full-width with orange focus ring + "Ask →" button

**Component state:**
```tsx
const [messages, setMessages] = useState<{role: 'user'|'ai', content: string}[]>([])
const [input, setInput] = useState('')
const [loading, setLoading] = useState(false)
```

### Step 5 — API Route: `/api/listings/[id]/ask/route.ts`

Streaming POST. Accepts `{ question: string, history: {role: string, content: string}[] }`.

Fetch listing + seller server-side using `createAdminClient()`. Build system prompt:

```ts
const systemPrompt = `You are Ask Metal Gear, an AI assistant embedded on an industrial equipment listing page. You help buyers — primarily engineers and operations managers — evaluate this specific piece of equipment.

LISTING CONTEXT:
Title: ${listing.title}
Price: $${listing.price.toLocaleString()}
Condition Grade: ${listing.condition_grade}
Category: ${listing.tier1} > ${listing.tier2} > ${listing.subcategory}
Description: ${listing.description}
Specs: ${JSON.stringify(listing.specs)}
Location: ${listing.location}
Year: ${listing.year ?? 'Not listed'}
Manufacturer: ${listing.manufacturer ?? 'Not listed'}
Model: ${listing.model ?? 'Not listed'}
Seller: ${seller.company_name}, Trust Score ${seller.trust_score}/100, ${seller.review_count} reviews, ${seller.city} ${seller.state}

INSTRUCTIONS:
- Answer questions about this specific listing only
- Be direct and precise — no marketing language
- Never invent specs not listed above
- If asked about compatibility, give honest caveats — you don't know the buyer's exact setup
- If asked about pricing, note the platform has market data and the seller set this price
- If you can't answer from listing data, say so and suggest contacting the seller
- Keep responses to 2–4 sentences unless technical depth is genuinely needed
- Tone: knowledgeable industrial advisor, not a salesperson`
```

Stream response using `anthropic.messages.stream()` piped to a `ReadableStream` with `Content-Type: text/event-stream`. Handle errors — return JSON error if stream fails. No auth required on this route (public listing). Rate limit: 20 requests per IP per hour using Vercel edge rate limiting or a simple in-memory Map.

### Step 6 — ListingReviews Component

Shows seller reviews in context of this listing page. Layout:

- Summary bar: average stars + total count + 5-row breakdown bars (Amazon style)
- If seller has `profiles.reputation_summary` (from AI Reputation Summarizer), show it above individual reviews in a teal-bordered callout:
  ```
  ⚙ AI Summary · Based on 34 reviews
  "Ships equipment as described in 28 of 34 reviews. Responds within 2 hours..."
  ```
- Individual review cards: reviewer avatar, star rating, date, body text
- Limit to 5 reviews; "See all X reviews →" links to seller storefront
- If no reviews: "No reviews yet · Be the first to transact with this seller"

### Step 7 — Mobile Layout

Below `lg:` breakpoint:
- Gallery: full width, horizontal dot indicators below main image, swipe navigation (see Part 2)
- Main content: full width, stacked
- Purchase panel: **sticky bottom bar** — price + primary CTA. Tapping "See purchase options" expands to full panel in a bottom drawer (shadcn Sheet component)

```tsx
{/* Mobile sticky bottom bar */}
<div className="fixed bottom-0 left-0 right-0 lg:hidden border-t border-zinc-800
  bg-zinc-950/95 dark:bg-zinc-950/95 bg-white/95 backdrop-blur px-4 py-3
  flex items-center justify-between z-40">
  <div>
    <div className="text-xl font-bold font-display">${price.toLocaleString()}</div>
    <div className="text-xs text-zinc-400">{condition} · {location}</div>
  </div>
  <button className="bg-[#FF6B2B] text-white px-6 py-2.5 rounded-lg font-semibold text-sm">
    Make Offer
  </button>
</div>
```

Add `pb-20` to the page wrapper on mobile to prevent content hiding behind this bar.

### Edge Cases

- No images → placeholder with equipment category icon, zinc-900 background
- No specs → hide specs section entirely
- No condition report → skip that sub-section
- Own listing → show Edit + Analytics instead of offer/contact CTAs; Ask Metal Gear still active
- Expired/sold listing → status badge in panel, CTAs disabled with explanation; Ask Metal Gear still usable
- Ask Metal Gear API failure → show "Something went wrong. Try again." inline — never breaks page load
- Long descriptions → truncate at ~600 chars with "Read more" CSS `line-clamp` toggle

---

## Part 2 — Mobile Touch Swipe Gallery

### Objective
Add left/right touch swipe to navigate images in the listing gallery on mobile. No external swipe library — native touch events only.

### Files to Modify
- `src/app/(main)/listings/[id]/components/ListingGallery.tsx`

### Implementation

```tsx
const touchStartX = useRef<number>(0)
const touchEndX = useRef<number>(0)
const MIN_SWIPE = 50 // px threshold

const handleTouchStart = (e: React.TouchEvent) => {
  touchStartX.current = e.changedTouches[0].screenX
}

const handleTouchEnd = (e: React.TouchEvent) => {
  touchEndX.current = e.changedTouches[0].screenX
  const delta = touchStartX.current - touchEndX.current
  if (Math.abs(delta) < MIN_SWIPE) return
  if (delta > 0) goNext()  // swipe left → next image
  else goPrev()             // swipe right → previous image
}

const goNext = () => setActive(i => (i + 1) % images.length)
const goPrev = () => setActive(i => (i - 1 + images.length) % images.length)
```

Attach handlers to the main image container div:
```tsx
<div
  onTouchStart={handleTouchStart}
  onTouchEnd={handleTouchEnd}
  className="relative w-full aspect-square bg-zinc-950 rounded-xl overflow-hidden"
>
```

**Visual feedback:** Apply a CSS `translateX` slide transition when the active image changes. Use a `direction` state (`'left' | 'right' | null`) set in `goNext`/`goPrev`, then apply an animation class:

```css
/* globals.css */
@keyframes slideInFromRight {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);   opacity: 1; }
}
@keyframes slideInFromLeft {
  from { transform: translateX(-100%); opacity: 0; }
  to   { transform: translateX(0);     opacity: 1; }
}
.slide-in-right { animation: slideInFromRight 0.25s ease-out; }
.slide-in-left  { animation: slideInFromLeft  0.25s ease-out; }
```

Apply the class to the `<img>` tag based on `direction`, reset to `null` after animation ends using `onAnimationEnd`.

**Mobile dot indicators** (replace vertical thumbnail strip on mobile):
```tsx
<div className="flex justify-center gap-1.5 mt-3 lg:hidden">
  {images.map((_, i) => (
    <button
      key={i}
      onClick={() => setActive(i)}
      className={`w-2 h-2 rounded-full transition-all duration-200
        ${active === i ? 'bg-[#FF6B2B] w-4' : 'bg-zinc-600'}`}
    />
  ))}
</div>
```

**Edge cases:**
- Single image: don't render dots or swipe handlers
- Prevent accidental swipe during vertical scroll: only trigger if `Math.abs(deltaX) > Math.abs(deltaY)` — capture both X and Y in `touchStart` and compare in `touchEnd`
- Videos in gallery: tapping video thumbnail opens `VideoPlayer` in a dialog; swiping past video thumbnail advances to next image

---

## Part 3 — AI-Driven Help Button

### Objective
Replace the broken static help center button with a floating AI chat assistant. The button opens a chat panel powered by Claude. Context-aware: knows what page the user is on and can answer platform questions, explain features, and guide new users.

### Files to Create/Modify

**Modify:**
- `src/components/help-button.tsx` — full rebuild (or create if not yet extracted from layout)
- `src/app/(main)/layout.tsx` — ensure `<HelpButton />` is mounted with page context

**Create:**
- `src/app/api/help/chat/route.ts` — streaming AI help route

### UI Structure

Floating button: bottom-right corner (or bottom-left if SOS button is already bottom-right — check layout and place help on the opposite side).

```tsx
{/* Floating help button */}
<button
  onClick={() => setOpen(true)}
  className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full
    bg-[#3A8FD4] hover:bg-[#2a7fc4] text-white shadow-lg
    flex items-center justify-center transition-all duration-200
    hover:scale-110 active:scale-95"
  aria-label="Get help"
>
  <MessageCircle className="w-5 h-5" />
</button>
```

When open, show a chat panel (not a full-screen takeover):

```
┌──────────────────────────────────┐  ← fixed position, bottom-right
│ ⚙ Metal Gear Help          [×]  │
│ Ask me anything about the        │
│ platform                         │
├──────────────────────────────────┤
│                                  │
│  [AI message bubble]             │
│              [User message]      │
│  [AI message bubble]             │
│                                  │
├──────────────────────────────────┤
│ [ Ask anything...    ] [Send →]  │
└──────────────────────────────────┘
```

Panel sizing: `w-80 h-[480px]` fixed, `bottom-20 right-6`, `rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl flex flex-col`.

**Suggested starter questions** shown when thread is empty:
- "How does SOS work?"
- "What's included in Pro?"
- "How do I make an offer?"
- "Is my transaction protected?"

Clicking a chip submits it as the first message.

**Context passed to the API:** Include current pathname so Claude knows what page the user is on:
```tsx
const pathname = usePathname()
// POST /api/help/chat with { message, history, context: { pathname } }
```

**Conversation persistence:** Keep in component state only — resets when panel is closed. No DB writes.

### API Route: `/api/help/chat/route.ts`

Streaming POST. Accepts `{ message: string, history: Message[], context: { pathname: string } }`.

No auth required. Rate limit: 30 requests per IP per hour.

System prompt:
```ts
const systemPrompt = `You are the Metal Gear Help Assistant — a knowledgeable guide for the Metal Gear industrial equipment marketplace.

CURRENT PAGE: ${context.pathname}

ABOUT METAL GEAR:
Metal Gear is a B2B industrial equipment marketplace for oil & gas, petrochemical, mining, manufacturing, and CNC machining industries, based in Houston, TX.

KEY FEATURES:
- Buy and sell heavy industrial equipment with verified sellers
- SOS Broadcast: post urgent equipment needs, get responses from sellers within hours
- AI-powered search: describe your equipment in plain language
- Stripe escrow payments with buyer protection
- Equipment condition reports (grades A–F with mechanical/cosmetic/electrical scores)
- Subscription tiers: Free (3 listings), Pro ($179/mo), Business ($349/mo), Enterprise ($599/mo)
- Verified seller program with trust scores
- Offer & negotiation system with 72-hour auto-expiration
- AI pricing suggestions based on comparable sales
- Dispute resolution with AI mediation summaries

INSTRUCTIONS:
- Answer questions about the platform directly and helpfully
- If asked about a specific listing or seller, explain you don't have access to that data here — the Ask Metal Gear feature on the listing page can help
- Keep responses concise — 2–3 sentences for simple questions, more detail only when needed
- If the user seems to be having a technical issue, suggest they email support or use the contact form
- Tone: helpful, direct, industrial-professional — not overly cheerful
- Never make up features or pricing that isn't listed above`
```

Stream response using `anthropic.messages.stream()` with `text/event-stream`. Handle errors gracefully.

### Edge Cases
- If the existing help button/link navigates to `/help` (the static help center), remove or repurpose that navigation — the floating AI assistant replaces it
- If help center articles at `/help/[slug]` still exist, keep those routes but remove the floating button link to them; the AI is the primary help surface now
- Panel should not overlap the mobile bottom nav — on mobile, position above the nav bar: `bottom-20` or `bottom-24`
- Escape key closes the panel; clicking backdrop closes it
- If streaming fails: show "Something went wrong. Try again." inline

---

## Part 4 — Public QR / Shared Listing URLs (No Login Required)

### Objective
Listing detail pages accessed via QR code or shared URL must be fully viewable without authentication. Anonymous visitors see the full listing but get a soft prompt to create a free account when they attempt to interact (make offer, contact seller, save listing, use Ask Metal Gear with more than 3 messages).

### Files to Modify

**Modify:**
- `src/middleware.ts` — exempt `/listings/[id]` from auth redirect
- `src/app/(main)/listings/[id]/page.tsx` — handle unauthenticated server render
- `src/app/(main)/listings/[id]/components/ListingPurchasePanel.tsx` — gate interactive CTAs
- `src/app/(main)/listings/[id]/components/AskMetalGear.tsx` — allow 3 free messages, then gate

**Create:**
- `src/components/AnonInteractionGate.tsx` — reusable signup prompt modal

### Middleware Change

In `src/middleware.ts`, add `/listings/[id]` to the public routes list:

```ts
const PUBLIC_ROUTES = [
  '/',
  '/search',
  '/listings/:id',   // ← add this
  '/sellers/:id',
  '/equipment/:slug',
  '/pricing',
  '/about',
  '/terms',
  '/privacy',
  '/help',
  '/help/:slug',
]
```

Ensure the middleware matcher pattern allows `/listings/[id]` to reach the page without redirect. If using a blocklist approach (redirect all except auth routes), switch to an allowlist approach or specifically exempt the listings pattern:

```ts
// In middleware, before auth check:
if (request.nextUrl.pathname.match(/^\/listings\/[^/]+$/)) {
  return NextResponse.next() // always allow, page handles anon state
}
```

### Page-Level Anon Handling

In `page.tsx`, use `createAdminClient()` to fetch the listing (already server-side). Separately, get the current session without redirecting:

```ts
// Get session without throwing/redirecting on anon
const supabase = createAdminClient()
const { data: { session } } = await supabase.auth.getSession()
const currentUser = session?.user ?? null

// Pass to client components
<ListingPurchasePanel currentUser={currentUser} ... />
<AskMetalGear currentUser={currentUser} ... />
```

### AnonInteractionGate Component

`src/components/AnonInteractionGate.tsx` — reusable modal shown when an anonymous user attempts an interactive action.

```tsx
interface Props {
  open: boolean
  onClose: () => void
  action: 'offer' | 'contact' | 'save' | 'ask'
}

// Action-specific copy:
const copy = {
  offer:   { title: "Create a free account to make an offer", body: "Join Metal Gear to contact sellers, make offers, and buy industrial equipment securely." },
  contact: { title: "Create a free account to contact sellers", body: "Sign up free to message sellers directly about this listing." },
  save:    { title: "Save listings with a free account", body: "Create an account to save this listing and get alerts when prices change." },
  ask:     { title: "Sign up to continue the conversation", body: "You've used your 3 free questions. Create a free account to ask unlimited questions." },
}
```

Modal content:
```
┌─────────────────────────────────────┐
│ ⚙  [Action-specific title]          │
│     [Action-specific body]          │
│                                     │
│  [Create Free Account]  ← primary   │
│  [Sign In]              ← secondary │
│                                     │
│  No credit card required.           │
│  Free accounts include 3 listings.  │
└─────────────────────────────────────┘
```

"Create Free Account" links to `/signup?redirect=/listings/[id]` so the user returns to the listing after signing up. "Sign In" links to `/login?redirect=/listings/[id]`.

Use shadcn Dialog component. Styling: same dark card treatment as rest of site.

### Gating Logic

**ListingPurchasePanel:** If `currentUser` is null, wrap all three CTAs (Make Offer, Contact Seller, Save Listing) to open `AnonInteractionGate` with the appropriate `action` prop instead of performing the action.

**AskMetalGear:** Allow 3 messages before gating. Track in component state:
```tsx
const [messageCount, setMessageCount] = useState(0)
const ANON_LIMIT = 3

const handleSubmit = () => {
  if (!currentUser && messageCount >= ANON_LIMIT) {
    setGateOpen(true)
    setGateAction('ask')
    return
  }
  // proceed with API call
  setMessageCount(c => c + 1)
}
```

**What anonymous users can do without gating:**
- View full listing (all images, specs, description, price, location)
- Read reviews and AI reputation summary
- Use Ask Metal Gear (up to 3 questions)
- View seller storefront (read-only)

**What requires an account:**
- Make an offer
- Contact seller
- Save listing
- Ask Metal Gear (4th+ message)
- Access own dashboard, saved searches, SOS, etc.

### QR Code Generation

Ensure the existing QR code share feature generates links to the public listing URL — `https://metal-gear-five.vercel.app/listings/[id]` — with no auth token appended. Verify the QR generation code (likely in the listing detail page or a share button component) uses the canonical public URL, not a session-authenticated URL.

If QR codes currently redirect through a login wall, the middleware change above will fix that without any additional QR changes needed.

### Edge Cases
- If an anonymous user bookmarks the listing and returns later, the page must still render without redirect
- Seller's own listing viewed while logged out (e.g., they share the link): they see the public view, not the edit controls — those require auth
- `redirect` param on signup/login must be URL-encoded: `encodeURIComponent('/listings/' + id)`
- If the listing is `draft` status: still require auth to view (drafts are private — add a specific status check before the public render)
- Expired/sold listings: still publicly viewable (good for SEO and sharing)

---

## Success Criteria

- [ ] Desktop listing page renders three-column layout: gallery | content | sticky sidebar
- [ ] Sticky sidebar stays fixed to viewport top while scrolling; main content flows past it
- [ ] Mobile shows horizontal dot indicators and sticky bottom bar with price + CTA
- [ ] Swiping left/right on mobile gallery navigates images with slide animation
- [ ] Swipe correctly distinguishes horizontal vs vertical scroll intent
- [ ] "Ask Metal Gear" renders with 4 suggested chips; chips auto-submit on click
- [ ] AI responses stream word-by-word into the chat thread
- [ ] Floating help button opens AI chat panel (not static help center)
- [ ] Help AI responds in context of the current page
- [ ] `/listings/[id]` renders fully for anonymous users without auth redirect
- [ ] QR code links open listing without login wall
- [ ] Anonymous users can view listing and use Ask Metal Gear (3 messages)
- [ ] Anonymous users clicking Make Offer / Contact Seller / Save see `AnonInteractionGate`
- [ ] Gate modal links to `/signup?redirect=/listings/[id]` and `/login?redirect=/listings/[id]`
- [ ] No client-side Supabase calls anywhere in new components
- [ ] Light and dark mode both render correctly

---

## Commit Message

```
feat: Amazon-style listing page, mobile swipe gallery, AI help, public QR access

- Three-column listing layout: gallery / content / sticky purchase panel (position: sticky, align-self: start)
- Ask Metal Gear AI chat section with streaming responses and suggested question chips
- POST /api/listings/[id]/ask streaming route with listing-context system prompt
- Touch swipe navigation on mobile gallery with slide animation and direction detection
- Horizontal dot indicators on mobile replacing vertical thumbnail strip
- Rebuilt floating help button as streaming AI assistant (/api/help/chat)
- /listings/[id] now publicly accessible — no login required to view
- AnonInteractionGate modal with redirect-aware signup/login links
- Anonymous users gated on offer/contact/save; 3 free Ask Metal Gear messages
- QR share links open listings without auth wall

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
