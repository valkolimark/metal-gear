# Cycle 16-0 — Cloudflare R2 + Stream Media Migration

## Context
Metal Gear is a Next.js 15 B2B industrial equipment marketplace. All media is currently stored in Supabase Storage. Before seeding production inventory, we're migrating to Cloudflare R2 (images) and Cloudflare Stream (videos) for cost efficiency and zero egress fees. This is a pure infrastructure change — no UI behavior changes for users.

---

## Cloudflare Credentials (already set in Vercel env vars)

| Variable | Value |
|----------|-------|
| `CLOUDFLARE_ACCOUNT_ID` | c61e1a513e96a3b9df409959c2853c9c |
| `R2_BUCKET_NAME` | metal-gear-media |
| `R2_PUBLIC_URL` | https://media.metalgear.com |
| `R2_ACCESS_KEY_ID` | yfd1a6a09f499a6b6a7f17c5f8a92c24d |
| `R2_SECRET_ACCESS_KEY` | (encrypted — already in Vercel) |
| `CLOUDFLARE_STREAM_TOKEN` | (encrypted — already in Vercel) |
| `CLOUDFLARE_CUSTOMER_SUBDOMAIN` | customer-305dqqczrx52n91m.cloudflarestream.com |

Also add `CLOUDFLARE_STREAM_WEBHOOK_SECRET` to Vercel env vars after generating in Cloudflare dashboard.

---

## Objective
Migrate all user-uploaded media from Supabase Storage to:
- **Cloudflare R2** — listing images, avatars, SOS media, dispute evidence, condition reports
- **Cloudflare Stream** — listing videos (transcoding, adaptive bitrate, thumbnail generation)

After this cycle, Supabase Storage is no longer used for any media. Existing URLs must continue to resolve during and after migration (old Supabase files stay until migration script is manually confirmed).

---

## Critical Rule
All DB operations use server actions with `createAdminClient()`. No client-side Supabase calls — they hang in production due to RLS + SSR. All Cloudflare credentials must be server-side only — never exposed to the client.

---

## Files to Create

### `src/lib/r2.ts`
S3-compatible client pointing at Cloudflare R2.

```typescript
// Install: @aws-sdk/client-s3 @aws-sdk/lib-storage
// Endpoint: https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com
// Region: 'auto'

// Exports:
// uploadToR2(file: Buffer, key: string, contentType: string): Promise<string>
//   → Returns full public URL (R2_PUBLIC_URL + '/' + key)
// deleteFromR2(key: string): Promise<void>
// getR2Url(key: string): string

// Key naming conventions:
// listings/{listingId}/images/{uuid}.{ext}
// listings/{listingId}/thumbnails/{uuid}.{ext}
// avatars/{userId}/{uuid}.{ext}
// sos/{sosId}/{uuid}.{ext}
// disputes/{disputeId}/{uuid}.{ext}
// condition-reports/{reportId}/{uuid}.{ext}
```

### `src/lib/cloudflare-stream.ts`
Cloudflare Stream upload and management.

```typescript
// Exports:
// uploadToStream(file: Buffer, filename: string): Promise<StreamUploadResult>
//   StreamUploadResult: { videoId, thumbnailUrl, embedUrl, hlsUrl }
// getStreamVideo(videoId: string): Promise<StreamVideoDetails>
// deleteStreamVideo(videoId: string): Promise<void>

// Upload: POST https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/stream
// Use multipart/form-data for files under 200MB
// Use TUS protocol for files over 200MB
// Thumbnail: https://{CLOUDFLARE_CUSTOMER_SUBDOMAIN}/thumbnails/thumbnail.jpg
// Embed: https://iframe.videodelivery.net/{videoId}
// HLS: https://{CLOUDFLARE_CUSTOMER_SUBDOMAIN}/{videoId}/manifest/video.m3u8
```

### `src/lib/media.ts`
Unified media upload interface — single entry point for all uploads in the app.

```typescript
// Exports:
// uploadListingImage(file: Buffer, listingId: string, contentType: string): Promise<string>
// uploadListingVideo(file: Buffer, listingId: string, filename: string): Promise<VideoUploadResult>
// uploadAvatar(file: Buffer, userId: string, contentType: string): Promise<string>
// uploadSOSMedia(file: Buffer, sosId: string, contentType: string): Promise<string>
// uploadDisputeEvidence(file: Buffer, disputeId: string, contentType: string): Promise<string>
// uploadConditionReport(file: Buffer, reportId: string, contentType: string): Promise<string>
// deleteMedia(url: string): Promise<void>
//   → Detects R2 vs Stream from URL pattern and routes to correct delete function

// VideoUploadResult: { videoId: string, thumbnailUrl: string, embedUrl: string, hlsUrl: string }
```

### `src/components/ui/video-player.tsx`
Replace any raw HTML5 `<video>` player with Cloudflare Stream embed.

```typescript
// Props: { videoId?: string, embedUrl?: string, thumbnailUrl?: string, title?: string }
// Renders: <iframe src="https://iframe.videodelivery.net/{videoId}?autoplay=false&poster={thumbnailUrl}" />
// 16:9 aspect ratio wrapper
// Show thumbnail before play
// Loading skeleton while iframe loads
```

### `src/app/api/webhooks/cloudflare-stream/route.ts`
Handles Stream processing completion events.

```typescript
// POST handler
// Verify webhook signature using CLOUDFLARE_STREAM_WEBHOOK_SECRET
// On readyToStream: UPDATE listing_videos SET status = 'ready' WHERE stream_video_id = event.uid
// On error: UPDATE listing_videos SET status = 'error'
// Return 200 immediately — process async
```

### `scripts/migrate-media.ts`
One-time migration script. **Do not run automatically — Mark runs manually.**

```typescript
// Steps:
// 1. Query all listing_images with Supabase Storage URLs
// 2. For each: download from Supabase → upload to R2 → UPDATE listing_images SET url = r2Url
// 3. Query listing_videos → upload to Cloudflare Stream → UPDATE with stream_video_id + embed_url
// 4. Migrate profiles.avatar_url
// 5. Log success/failure to scripts/migration-log.json
//
// Safety: idempotent — skip records where URL already contains media.metalgear.com
// Concurrency: max 10 parallel uploads
// Run with: npx ts-node scripts/migrate-media.ts
// Test flag: --limit=10 (only migrate 10 records for verification)
```

---

## Files to Modify

### `src/app/(main)/listings/new/actions.ts`
- Replace all `supabase.storage` image upload calls with `uploadListingImage()` from `src/lib/media.ts`
- Replace video upload with `uploadListingVideo()`
- Remove all Supabase Storage references

### `src/app/(main)/listings/[id]/edit/actions.ts`
- Same replacements as above
- On image deletion: call `deleteMedia(url)` instead of Supabase Storage delete

### `src/app/(main)/profile/actions.ts`
- Replace avatar upload with `uploadAvatar()` from `src/lib/media.ts`

### `src/app/actions/sos.ts`
- Replace SOS media uploads with `uploadSOSMedia()`

### `src/app/actions/disputes.ts`
- Replace evidence uploads with `uploadDisputeEvidence()`

### `src/app/api/listings/analyze-image/route.ts`
- Confirm no Supabase Storage calls (images come as base64 in request body — no change needed)

### `next.config.ts`
- Add `media.metalgear.com` to `images.remotePatterns`
- Add `videodelivery.net` and `iframe.videodelivery.net` to remote patterns
- Add `customer-305dqqczrx52n91m.cloudflarestream.com` to remote patterns

---

## DB Schema Changes

```sql
-- Track Stream video IDs for management and webhook updates
ALTER TABLE listing_videos
  ADD COLUMN IF NOT EXISTS stream_video_id TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS embed_url TEXT,
  ADD COLUMN IF NOT EXISTS hls_url TEXT,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ready';
  -- status: 'processing' | 'ready' | 'error'

CREATE INDEX IF NOT EXISTS idx_listing_videos_stream_id
  ON listing_videos(stream_video_id);
```

---

## Error Handling Requirements
- R2 upload failure → throw error, do not save listing record
- Stream upload failure → save listing without video, return warning (video is non-blocking)
- Stream videos start with `status: 'processing'` → webhook flips to `ready`
- All upload functions: descriptive error messages including which service failed

---

## Testing Checklist
- [ ] Upload listing image → appears in R2 at `media.metalgear.com`, URL in DB, displays on listing
- [ ] Upload listing video → appears in Stream dashboard, embed plays in listing detail
- [ ] Upload avatar → R2, displays on profile and nav
- [ ] Delete listing image → removed from R2
- [ ] Stream webhook fires on processing complete → `status` → `ready` in DB
- [ ] Run migration script with `--limit=10` → 10 records updated, images still display
- [ ] No Cloudflare credentials visible in browser network tab or client bundle

---

## Success Criteria
- Zero Supabase Storage calls for any new media uploads after this deploy
- All existing Supabase Storage URLs continue to resolve (files not deleted until migration confirmed)
- Migration script successfully moves test batch of 10 listings with no data loss
- Video player works on listing detail page
- No client-side credential exposure

---

## Deployment
Trigger via Vercel API (not CLI — git author mismatch):
```bash
curl -s -X POST "https://api.vercel.com/v13/deployments?teamId=team_9n9GosoaraicsoDdbAFgzr5j" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"metal-gear","project":"prj_HQBv7jMhui6LGW5vzVC5pmCMndlx","gitSource":{"type":"github","ref":"main","org":"valkolimark","repo":"metal-gear"},"target":"production"}'
```

---

## Commit Message
```
feat: migrate media storage to Cloudflare R2 + Stream

- R2 for all images: listing photos, avatars, SOS, disputes, condition reports
- Cloudflare Stream for listing videos: transcoding, adaptive bitrate, thumbnails
- Unified media.ts interface for all upload/delete operations  
- Stream webhook handler for video processing status updates
- Video player component using Cloudflare Stream embed
- Migration script for existing Supabase Storage files (manual run with --limit flag)
- Zero egress cost architecture via media.metalgear.com CDN

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## After Deploy — Manual Steps
1. Verify a test image upload end-to-end
2. Verify a test video upload and Stream processing
3. Run `npx ts-node scripts/migrate-media.ts --limit=10`
4. Confirm 10 records display correctly with new URLs
5. Run full migration: `npx ts-node scripts/migrate-media.ts`
6. Confirm migration-log.json shows 0 errors
7. Do NOT delete Supabase Storage buckets until 100% of URLs confirmed updated
