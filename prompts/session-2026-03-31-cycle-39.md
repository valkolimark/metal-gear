# Session Summary — Cycle 39: Listing Media Quality Gate

**Date:** 2026-03-31
**Version:** 4.10.0
**Branch:** main

## What Was Built

Listings without at least one image or video are now hidden from all public discovery surfaces (search, feed, sitemap, related listings, etc.) while remaining accessible via direct URL. Sellers see amber warning banners on their hidden listings with CTAs to add photos.

## Database Changes

- `listings.has_media` — boolean NOT NULL DEFAULT false; backfilled from existing listing_images/listing_videos
- `sync_listing_has_media()` trigger function — fires on listing_images INSERT/DELETE and listing_videos INSERT/DELETE/UPDATE OF status
- `idx_listings_has_media` partial index — WHERE status = 'active' AND has_media = FALSE
- `listing_imports.hidden_listing_count` — integer, nullable

## Files Created

- `src/app/actions/listing-media-gate.ts` — getHiddenListingCount, isListingHiddenFromPublic
- `src/app/(main)/dashboard/components/hidden-listings-alert.tsx` — amber alert widget
- `supabase/migrations/20260331_listing_has_media.sql`

## Files Modified (has_media filter added)

- `src/app/(main)/search/page.tsx` — main search query
- `src/app/actions/feed.ts` — 5 functions (ForYou, PriceDrops, SavedSearchMatches, GeneralFeed, GeneralFeedRecent)
- `src/app/actions/team-activity.ts` — getSnipeListings
- `src/app/actions/related.ts` — 3 functions (getRelatedListings, getMoreFromSeller, getBuyersAlsoViewed)
- `src/app/actions/activity.ts` — getRecommendedListings, getTrendingListings
- `src/app/actions/companies-public.ts` — getCompanyActiveListings, getCompanyListingCount
- `src/app/sitemap.ts` — quality + recent listing queries
- `src/app/api/cron/smart-search-alerts/route.ts` — recent listings query
- `src/app/api/search/ai/route.ts` — AI search query
- `src/app/page.tsx` — homepage featured + fallback queries
- `src/app/(main)/sellers/[id]/page.tsx` — seller profile listings
- `src/app/(main)/profile/[id]/page.tsx` — public profile listings
- `src/app/(marketing)/equipment/[slug]/page.tsx` — category page listings

## Seller UX Changes

- `src/app/(main)/listings/[id]/page.tsx` — amber warning banner for owner when has_media=false
- `src/app/(main)/listings/page.tsx` — "No media — hidden" badge, ?filter=no-media param
- `src/app/(main)/listings/new/page.tsx` — non-blocking amber callout on Review step
- `src/app/(main)/dashboard/page.tsx` — HiddenListingsAlert widget
- `src/app/actions/import.ts` — hidden_listing_count at completion
- Import summary component — shows hidden count with Fix now link

## Backfill Results

- 65 listings with media (has_media=true)
- 528 active listings without media (has_media=false, now hidden from public)
