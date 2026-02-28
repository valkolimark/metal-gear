-- Cycle 6 Task 2: Seller Storefront & Business Profile

CREATE TABLE IF NOT EXISTS seller_storefronts (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  banner_url text,
  tagline text,
  featured_listing_ids uuid[] DEFAULT '{}',
  theme_color text DEFAULT '#FF6B2B',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE seller_storefronts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Storefronts are publicly readable"
  ON seller_storefronts FOR SELECT USING (true);

CREATE POLICY "Users can manage their own storefront"
  ON seller_storefronts FOR ALL USING (user_id = auth.uid());
