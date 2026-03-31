-- Cycle 39: Listing Media Quality Gate
-- Listings without media are hidden from all public discovery surfaces

-- 1. Add has_media column
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS has_media BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Backfill existing listings
UPDATE listings l
SET has_media = (
  EXISTS (
    SELECT 1 FROM listing_images li
    WHERE li.listing_id = l.id
  )
  OR EXISTS (
    SELECT 1 FROM listing_videos lv
    WHERE lv.listing_id = l.id
    AND lv.status != 'error'
  )
);

-- 3. Index for public query filtering
CREATE INDEX IF NOT EXISTS idx_listings_has_media
  ON listings (has_media)
  WHERE status = 'active' AND has_media = FALSE;

-- 4. Trigger function — fires on listing_images and listing_videos changes
CREATE OR REPLACE FUNCTION sync_listing_has_media()
RETURNS TRIGGER AS $$
DECLARE
  target_listing_id UUID;
BEGIN
  -- Determine which listing to update
  IF TG_OP = 'DELETE' THEN
    target_listing_id := OLD.listing_id;
  ELSE
    target_listing_id := NEW.listing_id;
  END IF;

  UPDATE listings
  SET has_media = (
    EXISTS (
      SELECT 1 FROM listing_images li
      WHERE li.listing_id = target_listing_id
    )
    OR EXISTS (
      SELECT 1 FROM listing_videos lv
      WHERE lv.listing_id = target_listing_id
      AND lv.status != 'error'
    )
  )
  WHERE id = target_listing_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger on listing_images
DROP TRIGGER IF EXISTS trg_listing_images_has_media ON listing_images;
CREATE TRIGGER trg_listing_images_has_media
  AFTER INSERT OR DELETE ON listing_images
  FOR EACH ROW
  EXECUTE FUNCTION sync_listing_has_media();

-- 6. Trigger on listing_videos (UPDATE included — status can change to 'error')
DROP TRIGGER IF EXISTS trg_listing_videos_has_media ON listing_videos;
CREATE TRIGGER trg_listing_videos_has_media
  AFTER INSERT OR DELETE OR UPDATE OF status ON listing_videos
  FOR EACH ROW
  EXECUTE FUNCTION sync_listing_has_media();

-- 7. Add hidden_listing_count to listing_imports
ALTER TABLE listing_imports
  ADD COLUMN IF NOT EXISTS hidden_listing_count INTEGER;
