-- Cycle 40: Unified Radar — collapse favorites + collections into single save system
-- Applied 2026-04-01

-- 1. Extend collections with is_default
ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_collections_default_per_user
  ON collections (user_id)
  WHERE is_default = TRUE;

-- 2. Extend collection_items with item type and new FKs
ALTER TABLE collection_items
  ALTER COLUMN listing_id DROP NOT NULL;

ALTER TABLE collection_items
  ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'listing'
    CHECK (item_type IN ('listing', 'feed_post', 'video'));

ALTER TABLE collection_items
  ADD COLUMN IF NOT EXISTS feed_post_id UUID
    REFERENCES feed_posts(id) ON DELETE CASCADE;

ALTER TABLE collection_items
  ADD COLUMN IF NOT EXISTS video_ref_id UUID;

ALTER TABLE collection_items
  ADD COLUMN IF NOT EXISTS video_source_type TEXT
    CHECK (video_source_type IN ('listing_video', 'feed_post_video'));

ALTER TABLE collection_items
  ADD COLUMN IF NOT EXISTS video_thumbnail_url TEXT;

ALTER TABLE collection_items
  ADD COLUMN IF NOT EXISTS video_title TEXT;

ALTER TABLE collection_items
  ADD COLUMN IF NOT EXISTS video_listing_id UUID
    REFERENCES listings(id) ON DELETE CASCADE;

ALTER TABLE collection_items
  ADD COLUMN IF NOT EXISTS video_post_id UUID
    REFERENCES feed_posts(id) ON DELETE CASCADE;

-- 3. Replace old unique constraint with per-type unique indexes
ALTER TABLE collection_items
  DROP CONSTRAINT IF EXISTS collection_items_collection_id_listing_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_radar_item_listing
  ON collection_items (collection_id, listing_id)
  WHERE item_type = 'listing' AND listing_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_radar_item_post
  ON collection_items (collection_id, feed_post_id)
  WHERE item_type = 'feed_post' AND feed_post_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_radar_item_video
  ON collection_items (collection_id, video_ref_id)
  WHERE item_type = 'video' AND video_ref_id IS NOT NULL;

-- 4. Create default radar list for every existing user
INSERT INTO collections (user_id, name, description, is_public, is_default)
SELECT DISTINCT
  p.id,
  'Saved',
  'Your default radar list',
  FALSE,
  TRUE
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM collections c
  WHERE c.user_id = p.id AND c.is_default = TRUE
);

-- 5. Migrate favorites → collection_items in each user's default list
INSERT INTO collection_items (collection_id, listing_id, item_type)
SELECT
  c.id AS collection_id,
  f.listing_id,
  'listing' AS item_type
FROM favorites f
JOIN collections c ON c.user_id = f.user_id AND c.is_default = TRUE
ON CONFLICT DO NOTHING;

-- 6. Indexes for Radar tab queries
CREATE INDEX IF NOT EXISTS idx_collection_items_type
  ON collection_items (item_type);

CREATE INDEX IF NOT EXISTS idx_collection_items_feed_post
  ON collection_items (feed_post_id)
  WHERE feed_post_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_collection_items_video
  ON collection_items (video_ref_id)
  WHERE video_ref_id IS NOT NULL;

-- NOTE: favorites table retained as read-only archive. Do NOT drop in this migration.
