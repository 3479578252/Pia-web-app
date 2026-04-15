-- PIA Web App: Initial Schema
-- Aligned with OAIC PIA Guide and Australian Privacy Act 1988

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('privacy_officer', 'project_manager', 'other');
CREATE TYPE assessment_status AS ENUM ('draft', 'in_review', 'approved', 'archived');
CREATE TYPE threshold_result AS ENUM ('full_pia_required', 'not_required', 'pending');
CREATE TYPE risk_likelihood AS ENUM ('rare', 'unlikely', 'possible', 'likely', 'almost_certain');
CREATE TYPE risk_consequence AS ENUM ('insignificant', 'minor', 'moderate', 'major', 'catastrophic');
CREATE TYPE risk_status AS ENUM ('identified', 'mitigating', 'accepted', 'resolved');
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
CREATE TYPE notification_type AS ENUM (
  'assessment_assigned',
  'assessment_status_changed',
  'comment_added',
  'review_requested',
  'invite_received',
  'reminder_incomplete'
);
CREATE TYPE compliance_status AS ENUM ('compliant', 'partially_compliant', 'non_compliant', 'not_applicable', 'not_assessed');
CREATE TYPE data_flow_editor_preference AS ENUM ('form', 'visual');

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  role user_role,
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  data_flow_preference data_flow_editor_preference NOT NULL DEFAULT 'form',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INVITES
-- ============================================================

CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,                          -- NULL for code-based invites
  code TEXT UNIQUE,                    -- shareable invite code
  role user_role NOT NULL DEFAULT 'other',
  status invite_status NOT NULL DEFAULT 'pending',
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  accepted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invites_code ON public.invites(code) WHERE code IS NOT NULL;
CREATE INDEX idx_invites_email ON public.invites(email) WHERE email IS NOT NULL;

-- ============================================================
-- ASSESSMENTS
-- ============================================================

CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  project_name TEXT,
  project_description TEXT,
  status assessment_status NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assessments_created_by ON public.assessments(created_by);
CREATE INDEX idx_assessments_status ON public.assessments(status);

-- ============================================================
-- THRESHOLD CHECKS
-- ============================================================

CREATE TABLE public.threshold_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  responses JSONB NOT NULL DEFAULT '{}',
  result threshold_result NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(assessment_id)
);

-- ============================================================
-- DATA FLOWS
-- ============================================================

CREATE TABLE public.data_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  description TEXT,
  personal_info_types TEXT[] NOT NULL DEFAULT '{}',
  collection_method TEXT,
  storage_location TEXT,
  access_controls TEXT,
  third_parties TEXT[] NOT NULL DEFAULT '{}',
  retention_period TEXT,
  disposal_method TEXT,
  visual_data JSONB,                    -- for visual editor, stores node/edge data
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_data_flows_assessment ON public.data_flows(assessment_id);

-- ============================================================
-- APP ANALYSES (13 Australian Privacy Principles)
-- ============================================================

CREATE TABLE public.app_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  app_number INTEGER NOT NULL CHECK (app_number BETWEEN 1 AND 13),
  compliance_status compliance_status NOT NULL DEFAULT 'not_assessed',
  responses JSONB NOT NULL DEFAULT '{}',    -- stores question/answer pairs from branching questionnaire
  findings TEXT,
  recommendations TEXT,
  ai_suggestions JSONB,                     -- AI-generated compliance concerns
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(assessment_id, app_number)
);

CREATE INDEX idx_app_analyses_assessment ON public.app_analyses(assessment_id);

-- ============================================================
-- RISKS
-- ============================================================

CREATE TABLE public.risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category TEXT,
  likelihood risk_likelihood NOT NULL DEFAULT 'possible',
  consequence risk_consequence NOT NULL DEFAULT 'moderate',
  risk_score INTEGER GENERATED ALWAYS AS (
    (CASE likelihood
      WHEN 'rare' THEN 1
      WHEN 'unlikely' THEN 2
      WHEN 'possible' THEN 3
      WHEN 'likely' THEN 4
      WHEN 'almost_certain' THEN 5
    END) *
    (CASE consequence
      WHEN 'insignificant' THEN 1
      WHEN 'minor' THEN 2
      WHEN 'moderate' THEN 3
      WHEN 'major' THEN 4
      WHEN 'catastrophic' THEN 5
    END)
  ) STORED,
  mitigation TEXT,
  residual_likelihood risk_likelihood,
  residual_consequence risk_consequence,
  status risk_status NOT NULL DEFAULT 'identified',
  ai_suggested BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_risks_assessment ON public.risks(assessment_id);

-- ============================================================
-- COMMENTS
-- ============================================================

CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  section TEXT,                           -- which section of the assessment this comment is on
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_assessment ON public.comments(assessment_id);

-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_assessment ON public.audit_log(assessment_id);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id) WHERE NOT read;

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.threshold_checks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.data_flows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.app_analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.risks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threshold_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is privacy officer
CREATE OR REPLACE FUNCTION is_privacy_officer()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'privacy_officer'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if user owns or is assigned to an assessment
CREATE OR REPLACE FUNCTION can_access_assessment(assessment_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assessments
    WHERE id = assessment_uuid
      AND (created_by = auth.uid() OR assigned_to = auth.uid())
  ) OR is_privacy_officer();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES: users can read all profiles (for display names), update own
CREATE POLICY profiles_select ON public.profiles FOR SELECT USING (true);
CREATE POLICY profiles_insert ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update ON public.profiles FOR UPDATE USING (id = auth.uid() OR is_privacy_officer());

-- INVITES: privacy officers manage invites; users can see their own
CREATE POLICY invites_select ON public.invites FOR SELECT USING (
  is_privacy_officer() OR email = (SELECT email FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY invites_insert ON public.invites FOR INSERT WITH CHECK (is_privacy_officer());
CREATE POLICY invites_update ON public.invites FOR UPDATE USING (is_privacy_officer());

-- ASSESSMENTS: privacy officers see all; others see own/assigned
CREATE POLICY assessments_select ON public.assessments FOR SELECT USING (
  is_privacy_officer() OR created_by = auth.uid() OR assigned_to = auth.uid()
);
CREATE POLICY assessments_insert ON public.assessments FOR INSERT WITH CHECK (
  created_by = auth.uid()
);
CREATE POLICY assessments_update ON public.assessments FOR UPDATE USING (
  is_privacy_officer() OR created_by = auth.uid() OR assigned_to = auth.uid()
);
CREATE POLICY assessments_delete ON public.assessments FOR DELETE USING (
  is_privacy_officer() OR created_by = auth.uid()
);

-- THRESHOLD, DATA FLOWS, APP ANALYSES, RISKS: follow assessment access
CREATE POLICY threshold_select ON public.threshold_checks FOR SELECT USING (can_access_assessment(assessment_id));
CREATE POLICY threshold_insert ON public.threshold_checks FOR INSERT WITH CHECK (can_access_assessment(assessment_id));
CREATE POLICY threshold_update ON public.threshold_checks FOR UPDATE USING (can_access_assessment(assessment_id));

CREATE POLICY data_flows_select ON public.data_flows FOR SELECT USING (can_access_assessment(assessment_id));
CREATE POLICY data_flows_insert ON public.data_flows FOR INSERT WITH CHECK (can_access_assessment(assessment_id));
CREATE POLICY data_flows_update ON public.data_flows FOR UPDATE USING (can_access_assessment(assessment_id));
CREATE POLICY data_flows_delete ON public.data_flows FOR DELETE USING (can_access_assessment(assessment_id));

CREATE POLICY app_analyses_select ON public.app_analyses FOR SELECT USING (can_access_assessment(assessment_id));
CREATE POLICY app_analyses_insert ON public.app_analyses FOR INSERT WITH CHECK (can_access_assessment(assessment_id));
CREATE POLICY app_analyses_update ON public.app_analyses FOR UPDATE USING (can_access_assessment(assessment_id));

CREATE POLICY risks_select ON public.risks FOR SELECT USING (can_access_assessment(assessment_id));
CREATE POLICY risks_insert ON public.risks FOR INSERT WITH CHECK (can_access_assessment(assessment_id));
CREATE POLICY risks_update ON public.risks FOR UPDATE USING (can_access_assessment(assessment_id));
CREATE POLICY risks_delete ON public.risks FOR DELETE USING (can_access_assessment(assessment_id));

-- COMMENTS: follow assessment access
CREATE POLICY comments_select ON public.comments FOR SELECT USING (can_access_assessment(assessment_id));
CREATE POLICY comments_insert ON public.comments FOR INSERT WITH CHECK (
  user_id = auth.uid() AND can_access_assessment(assessment_id)
);
CREATE POLICY comments_update ON public.comments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY comments_delete ON public.comments FOR DELETE USING (user_id = auth.uid());

-- AUDIT LOG: privacy officers see all; others see related to their assessments
CREATE POLICY audit_log_select ON public.audit_log FOR SELECT USING (
  is_privacy_officer() OR can_access_assessment(assessment_id)
);
CREATE POLICY audit_log_insert ON public.audit_log FOR INSERT WITH CHECK (user_id = auth.uid());

-- NOTIFICATIONS: users see only their own
CREATE POLICY notifications_select ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY notifications_update ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY notifications_insert ON public.notifications FOR INSERT WITH CHECK (true);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
  assigned_role user_role;
BEGIN
  -- Count existing profiles to determine if this is the first user
  SELECT COUNT(*) INTO user_count FROM public.profiles;

  -- First user becomes privacy officer
  IF user_count = 0 THEN
    assigned_role := 'privacy_officer';
  ELSE
    assigned_role := NULL;  -- role assigned later by privacy officer
  END IF;

  INSERT INTO public.profiles (id, email, display_name, role, onboarding_complete)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    assigned_role,
    CASE WHEN user_count = 0 THEN TRUE ELSE FALSE END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
