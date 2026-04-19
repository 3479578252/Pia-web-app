-- 00004_comment_soft_delete.sql
-- Adds soft-delete support to comments.
-- Forward-only migration.
--
-- Application code MUST use UPDATE ... SET deleted_at = NOW()
-- instead of DELETE. Reads must filter WHERE deleted_at IS NULL.
--
-- No RLS policy change required: the existing comments_update policy
-- already requires user_id = auth.uid(), so only the author can
-- soft-delete their own comments.

BEGIN;

ALTER TABLE public.comments
  ADD COLUMN deleted_at TIMESTAMPTZ;

-- Partial index to keep active-comment reads fast.
CREATE INDEX idx_comments_active
  ON public.comments(assessment_id)
  WHERE deleted_at IS NULL;

COMMIT;

-- -----------------------------------------------------------------
-- Post-migration verification (run separately after the COMMIT):
--
-- SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'comments' AND column_name = 'deleted_at';
--
-- Expected row:
--   column_name | data_type                   | is_nullable
--   ------------+-----------------------------+-------------
--   deleted_at  | timestamp with time zone    | YES
-- -----------------------------------------------------------------
