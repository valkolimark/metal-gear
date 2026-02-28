-- Cycle 7, Task 3: Buyer & Seller Reviews (Post-Transaction)

-- Add transaction_id, listing_id, and review_type to reviews
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS transaction_id uuid REFERENCES transactions(id);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS listing_id uuid REFERENCES listings(id);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS review_type text DEFAULT 'seller' CHECK (review_type IN ('seller', 'buyer'));

-- Allow conversation_id to be null (transaction reviews don't need it)
ALTER TABLE reviews ALTER COLUMN conversation_id DROP NOT NULL;

-- One review per user per transaction
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_tx ON reviews(reviewer_id, transaction_id) WHERE transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_transaction ON reviews(transaction_id);
CREATE INDEX IF NOT EXISTS idx_reviews_listing ON reviews(listing_id);
