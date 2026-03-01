-- Cycle 7, Task 6: Seller Availability & Scheduling

CREATE TABLE IF NOT EXISTS seller_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Chicago',
  UNIQUE(user_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS viewing_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES profiles(id),
  seller_id uuid NOT NULL REFERENCES profiles(id),
  proposed_datetime timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seller_availability_user ON seller_availability(user_id);
CREATE INDEX IF NOT EXISTS idx_viewing_requests_seller ON viewing_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_viewing_requests_buyer ON viewing_requests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_viewing_requests_listing ON viewing_requests(listing_id);
