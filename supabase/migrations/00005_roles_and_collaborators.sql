-- 00005_roles_and_collaborators.sql
-- Step 5.5: team & collaborator management + RLS-2/4/6 fixes.
-- Forward-only. Run after 00004_comment_soft_delete.sql.
--
-- Covers:
--   1. Rename user_role value 'other' -> 'team_member'
--   2. Update invites.role default
--   3. Create assessment_collaborators join table + RLS
--   4. Migrate existing assigned_to values into the join table
--   5. Drop assessments.assigned_to column
--   6. Rewrite can_access_assessment() to use the join table
--   7. New can_edit_threshold() helper (PO + PM only)
--   8. Tighten threshold_checks RLS to require can_edit_threshold()
--   9. Rewrite assessments SELECT + UPDATE policies via can_access_assessment(id)
--  10. RLS-2: freeze assessments.created_by via BEFORE UPDATE trigger
--  11. RLS-4: restrict comments hard-delete to privacy_officer
--  12. RLS-6: last-privacy-officer guard trigger
--
-- All changes are inside one transaction. If any step fails, nothing is
-- applied.

BEGIN;

-- ============================================================
-- 1. Rename enum value
-- ============================================================
-- ALTER TYPE ... RENAME VALUE is atomic and preserves existing rows that
-- reference the value (they now read back as 'team_member').

ALTER TYPE user_role RENAME VALUE 'other' TO 'team_member';

-- ============================================================
-- 2. Invite default role
-- ============================================================

ALTER TABLE public.invites ALTER COLUMN role SET DEFAULT 'team_member';

-- ============================================================
-- 3. Collaborators table
-- ============================================================

CREATE TABLE public.assessment_collaborators (
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (assessment_id, user_id)
);

CREATE INDEX idx_collab_user       ON public.assessment_collaborators(user_id);
CREATE INDEX idx_collab_assessment ON public.assessment_collaborators(assessment_id);

ALTER TABLE public.assessment_collaborators ENABLE ROW LEVEL SECURITY;

-- SELECT: PO sees everything; a user sees their own rows; creator of the
-- assessment sees its collaborator list.
CREATE POLICY collab_select ON public.assessment_collaborators
  FOR SELECT USING (
    is_privacy_officer()
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.assessments
      WHERE id = assessment_id AND created_by = auth.uid()
    )
  );

-- INSERT: PO only, and the target assessment must not be archived.
CREATE POLICY collab_insert ON public.assessment_collaborators
  FOR INSERT WITH CHECK (
    is_privacy_officer()
    AND NOT EXISTS (
      SELECT 1 FROM public.assessments
      WHERE id = assessment_id AND status = 'archived'
    )
  );

-- DELETE: PO only, and the target assessment must not be archived.
CREATE POLICY collab_delete ON public.assessment_collaborators
  FOR DELETE USING (
    is_privacy_officer()
    AND NOT EXISTS (
      SELECT 1 FROM public.assessments
      WHERE id = assessment_id AND status = 'archived'
    )
  );

-- ============================================================
-- 4. Migrate existing assigned_to values
-- ============================================================
-- Anyone currently assigned to a PIA (and not its creator) becomes a
-- collaborator. added_by is recorded as the creator since we don't have a
-- historical record of who assigned them.

INSERT INTO public.assessment_collaborators (assessment_id, user_id, added_by)
SELECT id, assigned_to, created_by
FROM public.assessments
WHERE assigned_to IS NOT NULL
  AND assigned_to <> created_by
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. Drop assigned_to column
-- ============================================================

ALTER TABLE public.assessments DROP COLUMN assigned_to;

-- ============================================================
-- 6. Rewrite can_access_assessment()
-- ============================================================
-- Union: PO, creator, or collaborator.

CREATE OR REPLACE FUNCTION can_access_assessment(assessment_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT is_privacy_officer()
    OR EXISTS (
      SELECT 1 FROM public.assessments
      WHERE id = assessment_uuid AND created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.assessment_collaborators
      WHERE assessment_id = assessment_uuid AND user_id = auth.uid()
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 7. can_edit_threshold() helper
-- ============================================================
-- Role-based: privacy_officer and project_manager can edit threshold;
-- team_member cannot (even on their own PIAs).

CREATE OR REPLACE FUNCTION can_edit_threshold()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('privacy_officer', 'project_manager')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 8. Tighten threshold policies
-- ============================================================

DROP POLICY threshold_insert ON public.threshold_checks;
DROP POLICY threshold_update ON public.threshold_checks;

CREATE POLICY threshold_insert ON public.threshold_checks
  FOR INSERT WITH CHECK (
    can_access_assessment(assessment_id) AND can_edit_threshold()
  );

CREATE POLICY threshold_update ON public.threshold_checks
  FOR UPDATE USING (
    can_access_assessment(assessment_id) AND can_edit_threshold()
  );

-- SELECT unchanged: any user with access can view the threshold result.

-- ============================================================
-- 9. Assessments SELECT + UPDATE policies via the new helper
-- ============================================================

DROP POLICY assessments_select ON public.assessments;
DROP POLICY assessments_update ON public.assessments;

CREATE POLICY assessments_select ON public.assessments
  FOR SELECT USING (can_access_assessment(id));

CREATE POLICY assessments_update ON public.assessments
  FOR UPDATE
  USING (can_access_assessment(id))
  WITH CHECK (can_access_assessment(id));

-- ============================================================
-- 10. RLS-2: freeze created_by
-- ============================================================

CREATE OR REPLACE FUNCTION forbid_created_by_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'created_by is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER freeze_created_by
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION forbid_created_by_change();

-- ============================================================
-- 11. RLS-4: PO-only hard delete on comments
-- ============================================================

DROP POLICY comments_delete ON public.comments;

CREATE POLICY comments_delete ON public.comments
  FOR DELETE USING (is_privacy_officer());

-- Normal users go through the soft-delete path (UPDATE deleted_at); app
-- code already does this. Comments_update policy (user_id = auth.uid()) is
-- unchanged.

-- ============================================================
-- 12. RLS-6: last privacy officer guard
-- ============================================================

CREATE OR REPLACE FUNCTION ensure_at_least_one_po()
RETURNS TRIGGER AS $$
DECLARE
  po_count INTEGER;
BEGIN
  IF OLD.role = 'privacy_officer'
     AND (NEW.role IS NULL OR NEW.role <> 'privacy_officer') THEN
    SELECT COUNT(*) INTO po_count
      FROM public.profiles
      WHERE role = 'privacy_officer';
    IF po_count <= 1 THEN
      RAISE EXCEPTION 'Cannot demote the last privacy officer';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER last_po_guard
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION ensure_at_least_one_po();

COMMIT;

-- ============================================================
-- Post-migration verification (run manually after applying)
-- ============================================================
--
-- SELECT enumlabel FROM pg_enum
--   WHERE enumtypid = 'user_role'::regtype
--   ORDER BY enumsortorder;
-- -- expect: privacy_officer, project_manager, team_member
--
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'assessments' AND column_name = 'assigned_to';
-- -- expect: zero rows
--
-- SELECT table_name FROM information_schema.tables
--   WHERE table_name = 'assessment_collaborators';
-- -- expect: one row
--
-- SELECT tgname FROM pg_trigger
--   WHERE tgname IN ('freeze_created_by', 'last_po_guard');
-- -- expect: two rows
