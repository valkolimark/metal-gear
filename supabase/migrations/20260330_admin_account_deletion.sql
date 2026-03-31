-- ============================================================================
-- Cycle 35 — Super Admin Account Deletion
-- Adds deletion tracking, message soft-delete, R2 cleanup queue,
-- and alters FK constraints to preserve conversations/reviews on hard delete
-- ============================================================================

-- ─── Deletion tracking on profiles ─────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_type text CHECK (deletion_type IN ('soft', 'hard')),
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deletion_reason text;

CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at) WHERE deleted_at IS NOT NULL;

-- ─── Message soft-delete columns ───────────────────────────────────────────
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_content_replacement text;

-- ─── R2 cleanup queue ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS r2_cleanup_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  r2_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error text
);

CREATE INDEX IF NOT EXISTS idx_r2_cleanup_unprocessed ON r2_cleanup_queue(created_at)
  WHERE processed_at IS NULL;

-- ─── Alter FK constraints to prevent cascade on hard delete ────────────────
-- Reviews: preserve reviews about deleted sellers (anonymize seller_id → NULL)
ALTER TABLE reviews ALTER COLUMN seller_id DROP NOT NULL;
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_seller_id_fkey;
ALTER TABLE reviews
  ADD CONSTRAINT reviews_seller_id_fkey
  FOREIGN KEY (seller_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Conversations: preserve for the other party
ALTER TABLE conversations ALTER COLUMN buyer_id DROP NOT NULL;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_buyer_id_fkey;
ALTER TABLE conversations
  ADD CONSTRAINT conversations_buyer_id_fkey
  FOREIGN KEY (buyer_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE conversations ALTER COLUMN seller_id DROP NOT NULL;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_seller_id_fkey;
ALTER TABLE conversations
  ADD CONSTRAINT conversations_seller_id_fkey
  FOREIGN KEY (seller_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Messages: preserve with content replacement
ALTER TABLE messages ALTER COLUMN sender_id DROP NOT NULL;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE messages
  ADD CONSTRAINT messages_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE SET NULL;
