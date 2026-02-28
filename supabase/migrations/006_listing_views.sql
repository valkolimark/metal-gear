-- Listing views tracking (timestamped view events for analytics)
CREATE TABLE IF NOT EXISTS listing_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  viewed_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_listing_views_listing_id ON listing_views(listing_id);
CREATE INDEX idx_listing_views_viewed_at ON listing_views(viewed_at);
CREATE INDEX idx_listing_views_listing_date ON listing_views(listing_id, viewed_at);

ALTER TABLE listing_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert views"
  ON listing_views FOR INSERT WITH CHECK (true);

CREATE POLICY "Listing owners can read their views"
  ON listing_views FOR SELECT
  USING (listing_id IN (SELECT id FROM listings WHERE seller_id = auth.uid()));
