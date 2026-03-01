-- Cycle 8, Task 8: Composite indexes for common query patterns

-- Listings: seller + status (inventory page, dashboard queries)
CREATE INDEX IF NOT EXISTS idx_listings_seller_status ON listings(seller_id, status);

-- Listings: category + status (search/browse)
CREATE INDEX IF NOT EXISTS idx_listings_category_status ON listings(category, status);

-- Listings: status + created_at (public browse, recent listings)
CREATE INDEX IF NOT EXISTS idx_listings_status_created ON listings(status, created_at DESC);

-- Offers: listing + status (listing detail page offers)
CREATE INDEX IF NOT EXISTS idx_offers_listing_status ON offers(listing_id, status);

-- Offers: buyer + status (buyer dashboard)
CREATE INDEX IF NOT EXISTS idx_offers_buyer_status ON offers(buyer_id, status);

-- Transactions: buyer/seller + status (transaction page filters)
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_status ON transactions(buyer_id, status);
CREATE INDEX IF NOT EXISTS idx_transactions_seller_status ON transactions(seller_id, status);

-- Conversations: participant lookups
CREATE INDEX IF NOT EXISTS idx_conversations_buyer_updated ON conversations(buyer_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_seller_updated ON conversations(seller_id, last_message_at DESC);

-- Notifications: user + read status (notification center)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, created_at DESC);

-- Price watches: user + listing (check if watching)
CREATE INDEX IF NOT EXISTS idx_price_watches_user_listing ON price_watches(user_id, listing_id);

-- Favorites: user + listing (check if favorited)
CREATE INDEX IF NOT EXISTS idx_favorites_user_listing ON favorites(user_id, listing_id);

-- Listing views: listing + viewer (unique view check)
CREATE INDEX IF NOT EXISTS idx_listing_views_listing_viewer ON listing_views(listing_id, viewer_id);

-- Referrals: referred user lookup
CREATE INDEX IF NOT EXISTS idx_referrals_referred_status ON referrals(referred_id, status) WHERE referred_id IS NOT NULL;
