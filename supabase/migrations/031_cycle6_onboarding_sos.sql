-- ============================================================
-- Cycle 6: Enhanced Onboarding & SOS Broadcast System
-- ============================================================

-- ONBOARDING & USER PROFILE EXTENSIONS
CREATE TABLE IF NOT EXISTS user_business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  job_title TEXT,
  work_phone TEXT,
  show_phone_to TEXT DEFAULT 'no_one' CHECK (show_phone_to IN ('everyone', 'messaged', 'no_one')),
  show_email_to TEXT DEFAULT 'messaged' CHECK (show_email_to IN ('everyone', 'messaged', 'no_one')),
  show_company BOOLEAN DEFAULT true,
  show_name BOOLEAN DEFAULT true,
  primary_role TEXT NOT NULL CHECK (primary_role IN (
    'end_user', 'dealer', 'rebuilder', 'scrap', 'logistics', 'services'
  )),
  secondary_roles TEXT[] DEFAULT '{}',
  industries TEXT[] DEFAULT '{}',
  pain_points TEXT[] DEFAULT '{}',
  pain_points_other TEXT,
  trading_intents TEXT[] DEFAULT '{}',
  sos_responder BOOLEAN DEFAULT false,
  sos_categories TEXT[] DEFAULT '{}',
  sos_urgency_level TEXT DEFAULT 'all' CHECK (sos_urgency_level IN ('critical_only', 'all')),
  sos_notify_methods TEXT[] DEFAULT ARRAY['in_app'],
  sos_allow_realtime_contact BOOLEAN DEFAULT false,
  quality_agreement_accepted BOOLEAN DEFAULT false,
  quality_agreement_accepted_at TIMESTAMPTZ,
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_completed_at TIMESTAMPTZ,
  onboarding_step INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS user_equipment_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  sub_types TEXT[] DEFAULT '{}',
  brands TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category)
);

-- SOS BROADCAST SYSTEM
DO $$ BEGIN
  CREATE TYPE sos_status AS ENUM ('active', 'fulfilled', 'expired', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sos_urgency AS ENUM ('critical', 'normal');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sos_response_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS sos_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  equipment_category TEXT NOT NULL,
  equipment_sub_type TEXT,
  brand TEXT,
  model TEXT,
  urgency sos_urgency DEFAULT 'critical',
  status sos_status DEFAULT 'active',
  photos TEXT[] DEFAULT '{}',
  videos TEXT[] DEFAULT '{}',
  notes TEXT,
  location_city TEXT,
  location_state TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  max_distance_miles INTEGER DEFAULT 500,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '72 hours'),
  fulfilled_at TIMESTAMPTZ,
  fulfilled_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sos_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sos_request_id UUID NOT NULL REFERENCES sos_requests(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  price_estimate TEXT,
  lead_time TEXT,
  condition TEXT,
  photos TEXT[] DEFAULT '{}',
  status sos_response_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sos_request_id, responder_id)
);

CREATE TABLE IF NOT EXISTS sos_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sos_request_id UUID NOT NULL REFERENCES sos_requests(id) ON DELETE CASCADE,
  notified_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_method TEXT NOT NULL CHECK (notify_method IN ('in_app', 'email', 'sms')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  UNIQUE(sos_request_id, notified_user_id, notify_method)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_ubp_user ON user_business_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_ubp_role ON user_business_profiles(primary_role);
CREATE INDEX IF NOT EXISTS idx_ubp_sos ON user_business_profiles(sos_responder) WHERE sos_responder = true;
CREATE INDEX IF NOT EXISTS idx_uei_user ON user_equipment_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_uei_category ON user_equipment_interests(category);
CREATE INDEX IF NOT EXISTS idx_sos_req_status ON sos_requests(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_sos_req_category ON sos_requests(equipment_category);
CREATE INDEX IF NOT EXISTS idx_sos_req_requester ON sos_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_sos_req_expires ON sos_requests(expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_sos_resp_request ON sos_responses(sos_request_id);
CREATE INDEX IF NOT EXISTS idx_sos_resp_responder ON sos_responses(responder_id);
CREATE INDEX IF NOT EXISTS idx_sos_notif_request ON sos_notifications(sos_request_id);
CREATE INDEX IF NOT EXISTS idx_sos_notif_user ON sos_notifications(notified_user_id);

-- RLS POLICIES
ALTER TABLE user_business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_equipment_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_notifications ENABLE ROW LEVEL SECURITY;

-- Business profiles: users can read all (transparency), write own
CREATE POLICY "Users can view all business profiles"
  ON user_business_profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own business profile"
  ON user_business_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own business profile"
  ON user_business_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Equipment interests: users can read all, write own
CREATE POLICY "Users can view all equipment interests"
  ON user_equipment_interests FOR SELECT USING (true);
CREATE POLICY "Users can manage own equipment interests"
  ON user_equipment_interests FOR ALL USING (auth.uid() = user_id);

-- SOS requests: all authenticated users can view active, requester manages own
CREATE POLICY "Authenticated users can view active SOS"
  ON sos_requests FOR SELECT USING (status = 'active' OR requester_id = auth.uid());
CREATE POLICY "Users can create SOS requests"
  ON sos_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Requester can update own SOS"
  ON sos_requests FOR UPDATE USING (auth.uid() = requester_id);

-- SOS responses: requester + responder can view, responder can create/update own
CREATE POLICY "SOS parties can view responses"
  ON sos_responses FOR SELECT USING (
    responder_id = auth.uid() OR
    sos_request_id IN (SELECT id FROM sos_requests WHERE requester_id = auth.uid())
  );
CREATE POLICY "Users can respond to SOS"
  ON sos_responses FOR INSERT WITH CHECK (auth.uid() = responder_id);
CREATE POLICY "Responder can update own response"
  ON sos_responses FOR UPDATE USING (auth.uid() = responder_id);

-- SOS notifications: user can view own
CREATE POLICY "Users can view own SOS notifications"
  ON sos_notifications FOR SELECT USING (notified_user_id = auth.uid());

-- FUNCTIONS
CREATE OR REPLACE FUNCTION expire_old_sos_requests()
RETURNS void AS $$
BEGIN
  UPDATE sos_requests
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION find_sos_responders(
  p_category TEXT,
  p_sub_type TEXT DEFAULT NULL
)
RETURNS TABLE(user_id UUID, notify_methods TEXT[]) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ubp.user_id,
    ubp.sos_notify_methods
  FROM user_business_profiles ubp
  JOIN user_equipment_interests uei ON uei.user_id = ubp.user_id
  WHERE ubp.sos_responder = true
    AND uei.category = p_category
    AND (p_sub_type IS NULL OR p_sub_type = ANY(uei.sub_types))
    AND ubp.onboarding_completed = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_active_sos_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM sos_requests
    WHERE requester_id = p_user_id AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add SOS tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE sos_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE sos_requests;
