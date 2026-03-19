-- ─────────────────────────────────────────────
-- Cycle 27a-1: Social Feed Tables
-- ─────────────────────────────────────────────

-- TABLES

CREATE TABLE feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES company_profiles(id) ON DELETE SET NULL,
  content TEXT DEFAULT '' CHECK (char_length(content) <= 1000),
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  tagged_user_ids UUID[] NOT NULL DEFAULT '{}',
  reactions_count INT NOT NULL DEFAULT 0,
  comments_count INT NOT NULL DEFAULT 0,
  is_deleted BOOL NOT NULL DEFAULT false,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE feed_post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  stream_video_id TEXT,
  thumbnail_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE feed_post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE feed_hashtags (
  tag TEXT PRIMARY KEY,
  post_count INT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────

CREATE INDEX idx_feed_posts_active_created
  ON feed_posts(created_at DESC)
  WHERE is_deleted = false;

CREATE INDEX idx_feed_posts_active_author
  ON feed_posts(author_id, created_at DESC)
  WHERE is_deleted = false;

CREATE INDEX idx_feed_posts_company_created
  ON feed_posts(company_id, created_at DESC)
  WHERE is_deleted = false;

CREATE INDEX idx_feed_posts_hashtags
  ON feed_posts USING GIN(hashtags);

CREATE INDEX idx_feed_post_media_post
  ON feed_post_media(post_id, sort_order);

CREATE INDEX idx_feed_post_reactions_lookup
  ON feed_post_reactions(post_id, user_id);

CREATE INDEX idx_feed_post_reactions_user
  ON feed_post_reactions(user_id, created_at DESC);

CREATE INDEX idx_feed_hashtags_trending
  ON feed_hashtags(last_used_at DESC, post_count DESC);

CREATE INDEX IF NOT EXISTS idx_user_equipment_interests_user_tier2
  ON user_equipment_interests(user_id, tier2);

CREATE INDEX IF NOT EXISTS idx_user_equipment_interests_tier2
  ON user_equipment_interests(tier2);

CREATE INDEX IF NOT EXISTS idx_user_business_profiles_user_id
  ON user_business_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_business_profiles_industries_gin
  ON user_business_profiles USING GIN(industries);

-- ─────────────────────────────────────────────
-- TRIGGER
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_feed_post_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feed_posts_updated_at
  BEFORE UPDATE ON feed_posts
  FOR EACH ROW EXECUTE FUNCTION update_feed_post_updated_at();

-- ─────────────────────────────────────────────
-- ATOMIC HELPER FUNCTIONS
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION upsert_feed_hashtags(tags TEXT[])
RETURNS void AS $$
BEGIN
  INSERT INTO feed_hashtags (tag, post_count, last_used_at)
  SELECT unnest(tags), 1, now()
  ON CONFLICT (tag) DO UPDATE
  SET post_count = feed_hashtags.post_count + 1,
      last_used_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_feed_hashtags(tags TEXT[])
RETURNS void AS $$
BEGIN
  UPDATE feed_hashtags
  SET post_count = GREATEST(0, post_count - 1)
  WHERE tag = ANY(tags);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_post_reactions(p_post_id UUID)
RETURNS INT AS $$
  UPDATE feed_posts
  SET reactions_count = reactions_count + 1
  WHERE id = p_post_id
  RETURNING reactions_count;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_post_reactions(p_post_id UUID)
RETURNS INT AS $$
  UPDATE feed_posts
  SET reactions_count = GREATEST(0, reactions_count - 1)
  WHERE id = p_post_id
  RETURNING reactions_count;
$$ LANGUAGE sql SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- FOR YOU RPC FUNCTION
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_for_you_feed(
  p_user_id UUID,
  p_cursor TIMESTAMPTZ,
  p_limit INT
)
RETURNS TABLE (
  id UUID, content TEXT, hashtags TEXT[], tagged_user_ids UUID[],
  reactions_count INT, comments_count INT, edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ, author_id UUID, company_id UUID
) AS $$
BEGIN
  RETURN QUERY
  WITH viewer_tier2 AS (
    SELECT ARRAY_AGG(DISTINCT tier2) AS interests
    FROM user_equipment_interests
    WHERE user_id = p_user_id
  ),
  viewer_industries AS (
    SELECT industries
    FROM user_business_profiles
    WHERE user_id = p_user_id
    LIMIT 1
  ),
  relevant_authors AS (
    SELECT DISTINCT uei.user_id
    FROM user_equipment_interests uei
    CROSS JOIN viewer_tier2 vt
    WHERE vt.interests IS NOT NULL
      AND uei.tier2 = ANY(vt.interests)
      AND uei.user_id != p_user_id
    UNION
    SELECT DISTINCT ubp.user_id
    FROM user_business_profiles ubp
    CROSS JOIN viewer_industries vi
    WHERE vi.industries IS NOT NULL
      AND ubp.industries && vi.industries
      AND ubp.user_id != p_user_id
  )
  SELECT
    fp.id, fp.content, fp.hashtags, fp.tagged_user_ids,
    fp.reactions_count, fp.comments_count, fp.edited_at, fp.created_at,
    fp.author_id, fp.company_id
  FROM feed_posts fp
  WHERE fp.is_deleted = false
    AND fp.author_id IN (SELECT ra.user_id FROM relevant_authors ra)
    AND (p_cursor IS NULL OR fp.created_at < p_cursor)
  ORDER BY fp.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ─────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────

ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_hashtags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read active posts"
  ON feed_posts FOR SELECT TO authenticated
  USING (is_deleted = false);

CREATE POLICY "Authors can insert posts"
  ON feed_posts FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors can update own posts"
  ON feed_posts FOR UPDATE TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "Authenticated users read media"
  ON feed_post_media FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authors can insert media"
  ON feed_post_media FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM feed_posts WHERE id = post_id AND author_id = auth.uid())
  );

CREATE POLICY "Authenticated users read reactions"
  ON feed_post_reactions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users insert own reactions"
  ON feed_post_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own reactions"
  ON feed_post_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users read hashtags"
  ON feed_hashtags FOR SELECT TO authenticated
  USING (true);
