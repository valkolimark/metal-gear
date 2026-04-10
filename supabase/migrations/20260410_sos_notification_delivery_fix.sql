-- Cycle 50 hotfix — SOS notification delivery
-- Three independent bugs preventing SOS in-app notifications from reaching matched users:
--
-- 1. notifications.type CHECK constraint did not include sos_request_match
--    (or any of the post-cycle-5 notification types). Every SOS broadcast
--    insert was silently failing the constraint and getting swallowed by the
--    fire-and-forget Promise.allSettled in createNotification.
--
-- 2. find_sos_responders() Postgres RPC required SOS subcategory to be a
--    member of uei.subcategories. The Cycle 49 EquipmentInterestsEditor
--    inserts user_equipment_interests rows with subcategories: [], meaning
--    "all subcategories under this tier2". The RPC did not honor that — an
--    empty array failed the membership check, excluding everyone who opted
--    in at the tier2 level.
--
-- 3. find_sos_responders() also required user_business_profiles.sos_responder = true,
--    a legacy column. Current onboarding sets sos_opted_in (default true).
--    Switched the gate to sos_opted_in.
--
-- Also adds a sos_receive_all column on user_business_profiles so admins (or
-- any user) can explicitly subscribe to every SOS regardless of equipment
-- interest matches.

-- ─── 1. Expand notifications.type check constraint ──────────────────────

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
  type = ANY (ARRAY[
    'new_message'::text,
    'listing_inquiry'::text,
    'review_received'::text,
    'listing_sold'::text,
    'price_drop_alert'::text,
    'offer_received'::text,
    'offer_accepted'::text,
    'offer_rejected'::text,
    'offer_countered'::text,
    'transaction_initiated'::text,
    'transaction_update'::text,
    'dispute_opened'::text,
    'dispute_response'::text,
    'dispute_resolved'::text,
    'viewing_response'::text,
    'sos_request_match'::text,
    'sos_response_received'::text,
    'sos_response_accepted'::text,
    'sos_expired'::text,
    'sos_fulfilled'::text,
    'post_comment'::text,
    'post_mention'::text,
    'import_complete'::text,
    'import_failed'::text
  ])
);

-- ─── 2. Add sos_receive_all opt-in column ────────────────────────────────

ALTER TABLE user_business_profiles
  ADD COLUMN IF NOT EXISTS sos_receive_all boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN user_business_profiles.sos_receive_all IS
  'When true, this user receives every SOS broadcast regardless of equipment interest matches. Used by admins / monitors who want full visibility.';

-- ─── 3. Rewrite find_sos_responders ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.find_sos_responders(
  p_tier2 text,
  p_subcategory text DEFAULT NULL::text
)
RETURNS TABLE(user_id uuid, notify_methods text[])
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    ubp.user_id,
    ubp.sos_notify_methods
  FROM user_business_profiles ubp
  LEFT JOIN user_equipment_interests uei ON uei.user_id = ubp.user_id
  WHERE ubp.onboarding_completed = true
    AND ubp.sos_opted_in = true
    AND (
      -- Receive-all subscribers always match
      ubp.sos_receive_all = true
      OR (
        uei.tier2 = p_tier2
        AND (
          p_subcategory IS NULL
          OR uei.subcategories IS NULL
          OR cardinality(uei.subcategories) = 0  -- empty array = match all subcategories
          OR p_subcategory = ANY(uei.subcategories)
        )
      )
    );
END;
$function$;
