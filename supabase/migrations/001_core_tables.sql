-- ============================================================================
-- Metal Gear — Core Tables Migration
-- Profiles, Listings, Listing Images, Favorites
-- ============================================================================

-- ─── Helper: updated_at trigger function ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── Helper: auto-create profile on signup ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Profiles ───────────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL DEFAULT '',
  display_name  TEXT,
  avatar_url    TEXT,
  phone         TEXT,
  company_name  TEXT,
  bio           TEXT,
  industry      TEXT,
  location_city TEXT DEFAULT 'Houston',
  location_state TEXT DEFAULT 'TX',
  location_lat  DOUBLE PRECISION DEFAULT 29.7604,
  location_lng  DOUBLE PRECISION DEFAULT -95.3698,
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'boost')),
  is_verified_dealer BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can view profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (fallback if trigger misses)
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trigger: auto-update updated_at
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger: auto-create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Listings ───────────────────────────────────────────────────────────────
CREATE TABLE public.listings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  category        TEXT NOT NULL,
  industry        TEXT,
  condition       TEXT NOT NULL DEFAULT 'good' CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor', 'for_parts')),
  price_cents     INTEGER,
  negotiable      BOOLEAN NOT NULL DEFAULT false,
  contact_for_price BOOLEAN NOT NULL DEFAULT false,
  location_city   TEXT NOT NULL DEFAULT 'Houston',
  location_state  TEXT NOT NULL DEFAULT 'TX',
  location_lat    DOUBLE PRECISION NOT NULL DEFAULT 29.7604,
  location_lng    DOUBLE PRECISION NOT NULL DEFAULT -95.3698,
  specifications  JSONB DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'sold', 'expired', 'removed')),
  views_count     INTEGER NOT NULL DEFAULT 0,
  favorites_count INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Anyone can view active listings
CREATE POLICY "Active listings are viewable by everyone"
  ON public.listings FOR SELECT
  USING (status = 'active' OR seller_id = auth.uid());

-- Authenticated users can create listings
CREATE POLICY "Authenticated users can create listings"
  ON public.listings FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

-- Sellers can update their own listings
CREATE POLICY "Sellers can update own listings"
  ON public.listings FOR UPDATE
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- Sellers can delete their own listings
CREATE POLICY "Sellers can delete own listings"
  ON public.listings FOR DELETE
  USING (auth.uid() = seller_id);

-- Trigger: auto-update updated_at
CREATE TRIGGER listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Full-text search index
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(category, '')), 'C')
  ) STORED;

CREATE INDEX listings_fts_idx ON public.listings USING GIN (fts);
CREATE INDEX listings_seller_id_idx ON public.listings (seller_id);
CREATE INDEX listings_status_idx ON public.listings (status);
CREATE INDEX listings_category_idx ON public.listings (category);
CREATE INDEX listings_industry_idx ON public.listings (industry);
CREATE INDEX listings_condition_idx ON public.listings (condition);
CREATE INDEX listings_price_cents_idx ON public.listings (price_cents);
CREATE INDEX listings_created_at_idx ON public.listings (created_at DESC);
CREATE INDEX listings_location_idx ON public.listings (location_lat, location_lng);

-- ─── Listing Images ─────────────────────────────────────────────────────────
CREATE TABLE public.listing_images (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  url          TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  position     INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view images of visible listings
CREATE POLICY "Listing images are viewable by everyone"
  ON public.listing_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = listing_images.listing_id
      AND (listings.status = 'active' OR listings.seller_id = auth.uid())
    )
  );

-- Listing owners can manage images
CREATE POLICY "Listing owners can insert images"
  ON public.listing_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = listing_images.listing_id
      AND listings.seller_id = auth.uid()
    )
  );

CREATE POLICY "Listing owners can update images"
  ON public.listing_images FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = listing_images.listing_id
      AND listings.seller_id = auth.uid()
    )
  );

CREATE POLICY "Listing owners can delete images"
  ON public.listing_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = listing_images.listing_id
      AND listings.seller_id = auth.uid()
    )
  );

CREATE INDEX listing_images_listing_id_idx ON public.listing_images (listing_id);
CREATE INDEX listing_images_position_idx ON public.listing_images (listing_id, position);

-- ─── Favorites ──────────────────────────────────────────────────────────────
CREATE TABLE public.favorites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id  UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Users can see their own favorites
CREATE POLICY "Users can view own favorites"
  ON public.favorites FOR SELECT
  USING (auth.uid() = user_id);

-- Users can add favorites
CREATE POLICY "Users can add favorites"
  ON public.favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove favorites
CREATE POLICY "Users can remove favorites"
  ON public.favorites FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX favorites_user_id_idx ON public.favorites (user_id);
CREATE INDEX favorites_listing_id_idx ON public.favorites (listing_id);

-- ─── Function: Increment/Decrement favorites_count ──────────────────────────
CREATE OR REPLACE FUNCTION public.handle_favorite_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.listings SET favorites_count = favorites_count + 1
    WHERE id = NEW.listing_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.listings SET favorites_count = favorites_count - 1
    WHERE id = OLD.listing_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_favorite_change
  AFTER INSERT OR DELETE ON public.favorites
  FOR EACH ROW EXECUTE FUNCTION public.handle_favorite_count();
