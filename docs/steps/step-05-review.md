# Step 5 — Review / Approval Workflow

**Status:** design signed off · chunk 1 in progress
**Branch:** `claude/review-and-plan-BqrRI`
**Author:** Claude (handover session)
**Date:** 2026-04-19

## 1. Purpose

Deliver the review & approval UI for PIA assessments. This is the collaboration layer
that sits between "data entry is done" and "generate report": comments, status
transitions, and an audit trail.

## 2. Scope

In scope:
- Server-rendered review page fetching assessment, profile, comments, audit log
- Client-side review form with status-transition buttons, comment composer, comment list, audit log list
- Comment soft-delete (new `deleted_at` column)
- New server actions: `getAuditLog`, `addAuditLogEntry`, `getProfile`, completeness helper
- Update `deleteComment` to set `deleted_at` instead of hard delete
- Broader RLS + env-var leak review, logged in `docs/security-review.md`

Out of scope (logged in `docs/backlog.md`):
- Step 6 (report + Word export)
- Notification dispatch on status change (schema supports it; wiring later)
- Comment editing
- Comment threading / replies
- Rich text in comments
- Word-export branding/styling

## 3. File plan

New:
- `supabase/migrations/00004_comment_soft_delete.sql`
- `src/app/(app)/assessments/[id]/review/page.tsx`
- `src/app/(app)/assessments/[id]/review/review-form.tsx`
- `src/app/(app)/assessments/[id]/review/status-controls.tsx`
- `src/app/(app)/assessments/[id]/review/comments-panel.tsx`
- `src/app/(app)/assessments/[id]/review/audit-log.tsx`
- `src/lib/completeness.ts` — pure helper, no DB calls
- `src/lib/review-transitions.ts` — pure transition matrix
- `src/lib/section-labels.ts` — stored-value → display-label map
- `src/lib/format-time.ts` — relative time (with absolute on hover)
- `tests/unit/completeness.test.ts`
- `tests/unit/review-transitions.test.ts`
- `tests/unit/section-labels.test.ts`
- `tests/unit/format-time.test.ts`
- `tests/integration/review-workflow.test.ts`
- `docs/progress-log.md`
- `docs/steps/step-05-review.md` (this file)
- `docs/backlog.md`
- `docs/security-review.md`

Modified:
- `src/app/(app)/assessments/[id]/review/actions.ts` — add new actions, rewrite delete
- `src/types/database.ts` — add `deleted_at` to `Comment`, add `AuditLogEntry`, `AuditAction`, `CommentSection`

## 4. Status transitions (matrix)

| From → To | draft | in_review | approved | archived |
|-----------|-------|-----------|----------|----------|
| draft     | —     | anyone    | —        | anyone   |
| in_review | PO    | —         | PO       | anyone   |
| approved  | PO    | —         | —        | anyone   |
| archived  | PO*   | —         | —        | —        |

\* PO unarchive sends status back to `draft` (logged as `status_changed {from:"archived", to:"draft"}`).
"anyone" = any user with `can_access_assessment()` true.

UI: buttons visible per-role; server action re-checks. Archived state greys out
all write controls for every user; only PO sees an enabled "Unarchive" button.

## 5. Completeness check

Helper `isAssessmentComplete(data)` returns:

```ts
type CompletenessResult = {
  complete: boolean;
  missing: Array<{ section: CommentSection; label: string }>;
};
```

Rules (loose, flagged for revisit post-testing):
- **threshold** — `threshold_checks` row exists AND `result !== 'pending'`
- **data_flow** — at least one `data_flows` row
- **app_analysis** — all 13 APP numbers present in `app_analyses`, regardless of `compliance_status`
- **risks** — at least one `risks` row

Surfaced as:
- Banner at top of page in `draft` status listing missing sections (banner only — no confirm dialog)
- "Submit for review" button remains enabled; submit allowed with warning

Flagged in backlog: revisit rules + banner copy after live-env testing.

## 6. Comment section tags

| Stored (DB)     | Displayed (UI)             | Route                    |
|-----------------|----------------------------|--------------------------|
| `general`       | General comment            | —                        |
| `threshold`     | Threshold assessment       | `/threshold`             |
| `data_flow`     | Data flow mapping          | `/data-flow`             |
| `app_analysis`  | APP compliance analysis    | `/app-analysis`          |
| `risks`         | Risk register              | `/risks`                 |

Composer defaults to `general`. Section tag required on submit. Server validates
against the fixed set; unknown values rejected. Displayed as a Badge component
(no jump-link in Step 5 — tracked in backlog).

## 7. Audit log

**Action vocabulary (Option A)**:

| Action            | `details` JSON shape                            |
|-------------------|-------------------------------------------------|
| `status_changed`  | `{ from: AssessmentStatus, to: AssessmentStatus }` |
| `comment_added`   | `{ comment_id: string, section: CommentSection }`  |
| `comment_deleted` | `{ comment_id: string }`                           |

Unarchive entries use `status_changed {from:"archived", to:"draft"}` (no dedicated action).

**UI**:
- Chronological list (ascending by `created_at`)
- Checkbox filter group: "Status changes" | "Comments" (both checked by default)
- Each row: author name, action summary, relative time (absolute on hover)

**Server-side constraints**:
- Append-only: no update/delete exposed
- `user_id = auth.uid()` enforced by RLS
- `addAuditLogEntry` is always called inside the same server action that performs
  the underlying write (no client trigger)

## 8. Profile display / avatars

- Column source: `profiles.display_name` (schema column name; user spec said "full_name")
- Render initials up to 2 characters via existing `Avatar` component
- Timestamps relative ("2 hours ago") with absolute (`19 Apr 2026, 14:32 AEST`) on hover tooltip
- `format-time.ts` wraps `Intl.RelativeTimeFormat` (no new npm deps)

**Flagged**: reconcile naming ("full_name" in spec vs `display_name` in schema) — see backlog.

## 9. Migration 00004 (draft SQL — you will run manually)

```sql
-- 00004_comment_soft_delete.sql
-- Adds soft-delete to comments. Forward-only.

BEGIN;

ALTER TABLE public.comments
  ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE INDEX idx_comments_active
  ON public.comments(assessment_id)
  WHERE deleted_at IS NULL;

-- No RLS change: comments_update already requires user_id = auth.uid().
-- Application code MUST use UPDATE ... SET deleted_at instead of DELETE.

COMMIT;
```

**Post-migration verification SQL**:

```sql
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'comments' AND column_name = 'deleted_at';
```

## 10. Server actions (plan)

**Existing (keep)**
- `updateAssessmentStatus(assessmentId, status)` — add role-gate + audit-log entry
- `addComment(assessmentId, body, section)` — add audit-log entry
- `getComments(assessmentId)` — filter `deleted_at IS NULL`

**Rewrite**
- `deleteComment(commentId)` — set `deleted_at` via `.update()`; add audit-log entry

**New**
- `getAuditLog(assessmentId)` — returns ordered list
- `addAuditLogEntry(assessmentId, action, details)` — internal helper, always called server-side
- `getAssessmentForReview(assessmentId)` — batched fetch: assessment + comments + audit log + completeness data + author profiles

**Role gates (server-enforced)**
- `assertPrivacyOfficer()` — read profile, throw on mismatch
- `assertCanTransition(from, to, isPO)` — pure function against matrix in §4

## 11. Tests

**Unit (`src/__tests__/completeness.test.ts` and friends)**
- `isAssessmentComplete` — empty, partial, full data
- `assertCanTransition` — every matrix cell; positive + negative
- `addAuditLogEntry` — payload shape for each action type
- `format-time` — boundaries (just now / 1 min / yesterday)
- Section-label mapping — all keys round-trip

**Integration (`src/__tests__/review-actions.test.ts`)**
- Non-PO cannot approve (RLS + server action combined)
- Non-author cannot delete others' comments
- Archived assessment rejects writes except PO unarchive
- `deleteComment` sets `deleted_at`, not actual delete
- `getComments` excludes soft-deleted rows

No Playwright E2E in Step 5 (backlogged).

## 12. Security

**Threat model for Step 5**:
- Privilege escalation via UI hacking → defence: every server action re-checks role
- Role spoofing via stale client state → defence: server re-reads `profiles.role`
- Soft-delete bypass (deleted comment body leaking) → defence: filter in SQL, never in JS
- Audit log tampering → defence: no update/delete actions exposed; RLS append-only
- Tag injection → defence: server-side enum check
- Comment body XSS → defence: React default escaping, no `dangerouslySetInnerHTML`

Env-var and broader RLS reviews tracked in `docs/security-review.md`.

## 13. Verification smoke tests (run in browser at https://pia-web-app.vercel.app after each deploy)

**Setup**: You will need two accounts in the live environment — one privacy officer, one other role (project_manager or other). Create a test assessment with some but not all prior steps filled in.

**Test 13.1 — draft → in_review (non-PO user)**
1. Sign in as non-PO
2. Open test assessment → Review tab
3. Confirm banner lists missing sections
4. Click "Submit for review"
5. Status updates to In Review; audit log shows entry

**Test 13.2 — approval gated to PO**
1. Sign in as non-PO
2. Open in_review assessment → Review
3. Confirm "Approve" button is disabled (or absent) for non-PO
4. Sign in as PO → same assessment
5. Approve button enabled; click approves; audit log records change

**Test 13.3 — comment lifecycle**
1. As any user, post a comment tagged `data_flow`
2. Confirm it appears with correct badge ("Data flow mapping"), initials avatar, relative time
3. Hover time → tooltip shows absolute timestamp
4. Delete own comment → disappears from list
5. Sign in as a different user → confirm deleted comment does not reappear
6. Check `audit_log` entries for `comment_added` and `comment_deleted`

**Test 13.4 — cannot delete others' comments**
1. User A posts a comment
2. User B tries to delete (UI should not expose the delete button on A's row; server also rejects)

**Test 13.5 — archive + unarchive**
1. Any user archives an assessment
2. Composer disabled for all; buttons greyed with tooltip
3. Non-PO cannot unarchive (button hidden)
4. PO opens → sees "Unarchive"; click returns status to `draft`
5. Audit log records two `status_changed` entries

**Test 13.6 — revert to draft (PO only)**
1. PO opens an approved assessment → "Revert to draft" button
2. Click → status goes to `draft`; audit log records it

**Test 13.7 — audit log filter**
1. With mixed entries, uncheck "Comments" → only status entries visible
2. Uncheck "Status changes" → empty state; check both → full list

**Test 13.8 — completeness banner**
1. Fresh assessment with only threshold filled
2. Banner lists "Data flow mapping, APP compliance analysis, Risk register" as missing
3. Submit still works despite missing sections

## 14. Known issues / revisit list

See `docs/backlog.md` for the canonical list. Highlights:
- Completeness rules are loose — revisit after live-env testing
- Schema uses `display_name`; spec said "full_name" — resolve terminology
- Section-tag jump links deferred
- Notifications table exists but not wired
- Comment editing not supported
- Word-export styling deferred
- Rigorous live-env testing ongoing

## 15. Chunk commit plan

1. **Docs skeleton** ✅ — this design note + `progress-log.md` (Steps 1–4 backfilled) + `backlog.md` + `security-review.md`
2. **Migration** — `00004_comment_soft_delete.sql`. ⏸ **PAUSE** for you to run in Supabase
3. **Server actions** — new + rewritten actions, completeness helper, role-gate guards; type updates
4. **UI** — `page.tsx`, `review-form.tsx`, sub-components (`status-controls.tsx`, `comments-panel.tsx`, `audit-log.tsx`)
5. **Tests** — unit + integration
6. **Progress-log & security-review update** — mark chunks done; log env-audit + RLS-review findings

Each chunk = one commit on `claude/review-and-plan-BqrRI`. After chunk 6, I open the PR for your review + merge.

## 16. Deployment flow

Push to `claude/review-and-plan-BqrRI` → PR to `main` → you review + merge → Vercel auto-deploys → you run §13 smoke tests → report results → I log outcomes in `progress-log.md` under the "deployed" / "verification" sub-bullets.

---

**Sign-off** — 2026-04-19 — approved by user; chunk 1 in progress.
