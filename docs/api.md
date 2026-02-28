# Metal Gear API Documentation

## Webhook Endpoints

### POST `/api/webhooks/stripe`

Handles Stripe webhook events for subscription lifecycle management.

**Authentication:** Stripe signature verification via `STRIPE_WEBHOOK_SECRET`

**Rate Limit:** 100 requests/minute per IP

**Handled Events:**

| Event | Description |
|-------|-------------|
| `checkout.session.completed` | New subscription created. Stores customer ID, creates subscription record, updates profile tier, sends confirmation email. |
| `customer.subscription.updated` | Plan change or status update. Syncs tier, period dates, and cancellation state. |
| `customer.subscription.deleted` | Subscription canceled. Downgrades profile to free tier. |
| `invoice.payment_succeeded` | Recurring payment received. Records payment in `payments` table. |
| `invoice.payment_failed` | Payment failed. Marks subscription as `past_due`, downgrades to free. |

**Response:**
- `200 { received: true }` — Event processed successfully
- `400 { error: "..." }` — Missing or invalid signature
- `429 { error: "Too many requests" }` — Rate limit exceeded
- `500 { error: "Webhook handler failed" }` — Processing error

**Environment Variables Required:**
- `STRIPE_SECRET_KEY` — Stripe API key
- `STRIPE_WEBHOOK_SECRET` — Webhook signing secret
- `STRIPE_PREMIUM_PRICE_ID` — Price ID for Premium tier
- `STRIPE_BOOST_PRICE_ID` — Price ID for Boost tier

---

### GET/POST `/api/unsubscribe`

Handles email unsubscribe actions.

**GET `/api/unsubscribe?userId=<uuid>`**
Redirects to `/profile#notifications` for authenticated management.

**POST `/api/unsubscribe`**
Updates email notification preferences to disable all notifications.

**Request Body:**
```json
{ "userId": "uuid" }
```

**Response:**
- `200 { success: true }` — Preferences updated
- `400 { error: "..." }` — Missing userId

---

## Server Actions

All database operations use server actions (not direct client-side Supabase calls) to prevent hanging in production.

### Tier Management (`src/app/actions/tier.ts`)

| Action | Description |
|--------|-------------|
| `checkListingLimit()` | Returns `{ allowed, current, limit, tier, error }` |
| `checkConversationLimit()` | Returns `{ allowed, current, limit, tier, error }` |
| `checkPhotoLimit(existingCount)` | Returns `{ allowed, current, limit, tier, error }` |

### Analytics (`src/app/actions/analytics.ts`)

| Action | Description |
|--------|-------------|
| `recordListingView(listingId)` | Records a timestamped view event and increments views_count |
| `getSellerAnalytics()` | Returns views by day (30d), top listings, conversion rates |

### Search (`src/app/actions/search.ts`)

| Action | Description |
|--------|-------------|
| `getSavedSearches()` | Returns user's saved search filters |
| `saveSearch(name, filters)` | Saves current search filter set |
| `deleteSavedSearch(id)` | Removes a saved search |

### Reputation (`src/app/actions/reputation.ts`)

| Action | Description |
|--------|-------------|
| `submitReview(conversationId, sellerId, rating, comment)` | Submit 1-5 star review (buyers only) |
| `getSellerReviews(sellerId)` | Returns reviews, average rating, total count |
| `getSellerResponseTime(sellerId)` | Returns "Usually responds within X" label |
| `submitReport(targetType, targetId, reason, details)` | Report listing or user |
| `getProfileCompletionPercentage(userId)` | Weighted completion score (0-100) |

### Listings (`src/app/(main)/listings/actions.ts`)

| Action | Description |
|--------|-------------|
| `updateListingStatus(listingId, status)` | Change status (active/sold/expired/draft/removed), owner-only |
| `duplicateListing(listingId)` | Clone listing as draft with "(Copy)" suffix |

### Messages (`src/app/(main)/messages/actions.ts`)

| Action | Description |
|--------|-------------|
| `sendMessage(conversationId, content)` | Send message, triggers email notification |
| `startConversation(listingId)` | Start or resume conversation, triggers inquiry email |

### Checkout (`src/app/(main)/checkout/actions.ts`)

| Action | Description |
|--------|-------------|
| `createCheckoutSession(priceId)` | Creates Stripe Checkout session, returns redirect URL |
| `createBillingPortalSession()` | Creates Stripe Customer Portal session |
| `getSubscription()` | Returns active subscription record |

### Admin (`src/app/actions/admin.ts`)

| Action | Description |
|--------|-------------|
| `getAdminStats()` | Platform overview: users, listings, revenue, reports |
| `getRecentReports()` | Pending reports for moderation |
| `resolveReport(reportId, action)` | Resolve/dismiss report, optionally remove target |
