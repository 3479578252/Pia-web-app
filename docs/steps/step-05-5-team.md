# Step 5.5 — Team & Collaborator Management

**Status:** design signed off · chunk 1 in progress
**Branch:** `claude/review-and-plan-BqrRI`
**Author:** Claude (handover session)
**Date:** 2026-04-19

## 1. Purpose

Step 5 delivered the review workflow. Two issues surfaced from live testing:

1. **Team page freeze** — PO cannot assign roles; browser freezes silently when
   a role is selected. Root cause is a client-side infinite render loop.
2. **Collaborator model missing** — PO cannot see who created each PIA, and
   there is no way to let other users contribute to a PIA.

This step fixes the freeze, renames `other` → `team_member`, adds a
multi-collaborator join table, surfaces creator info in the UI, enforces a
role-based threshold-edit restriction, and resolves open security findings
RLS-2, RLS-4, and RLS-6 in the same migration.

## 2. Scope

In scope:
- Fix infinite-render freeze on `/settings/team` (and the same pattern on
  `/settings/invites`)
- Rename enum value `user_role.other` → `team_member`
- New `assessment_collaborators` table; PO manages membership
- Creator name on assessment header + assessments list page
- Role-based threshold edit gate: team_member read-only, PO/PM editable
- RLS-2 fix: freeze `assessments.created_by` via trigger
- RLS-4 fix: restrict comment hard-delete to PO only
- RLS-6 fix: last-privacy-officer guard trigger

Out of scope (backlog):
- Step 6 (report + Word export)
- Email notifications on collaborator add
- Comment purging UI for PO (RLS lets them; action not exposed yet)
- Step 5 smoke tests 13.1–13.8 re-run (already passed in Step 5)
- Step 5 backlog items (completeness rules, notifications wiring, Playwright)

## 3. Decisions log

| Decision | Choice | Rationale |
|---------|-------|----------|
| Rename `other`? | Yes → `team_member` | Clearer terminology; Postgres `ALTER TYPE … RENAME VALUE` is atomic and preserves row values |
| Role assignable from team page | `team_member`, `project_manager` only | PO role is single-org-locked |
| Permission model | Role-based (global, not per-PIA) | Simpler RLS; team_member cannot edit threshold even on PIAs they created |
| Collaborator model | Multi-collaborator join table | Scales beyond a single assignee |
| Creator implicit collaborator? | Yes (via `created_by`, not join-table row) | Cleaner RLS; creator cannot be removed by PO |
| `assigned_to` column | Deprecate; migrate existing values into join table | Single source of truth for contribution access |
| Collab management location | Inline panel on review page (PO only writes) | Matches existing review UI surface |
| Collaborator picker | Dropdown of profiles (exclude PO + existing) | Small orgs; upgradeable later |
| Archived PIAs | Block collab add/remove | PO must unarchive first; consistent with existing archive rule |
| Removal effect | Next page load (RLS-enforced) | No forced logout needed |
| Notifications | Silent for now | Backlog for Resend wiring |
| Threshold UX for team_member | Read-only with banner | Keeps visibility of result without edit rights |
| RLS-2 fix | Trigger freezing `created_by` | Handles OLD/NEW comparison which WITH CHECK cannot |
| RLS-4 fix | `comments_delete` → PO only | Keeps compliance/erasure escape hatch |
| RLS-6 fix | Last-PO trigger | Defence-in-depth beyond the UI guard |
| PR workflow | New PR #9 for Step 5.5 only | PR #8 merged; keep reviews small |

## 4. File plan

### New
- `docs/steps/step-05-5-team.md` (this file)
- `supabase/migrations/00005_roles_and_collaborators.sql`
- `src/app/(app)/assessments/[id]/review/collaborators-panel.tsx`
- `src/app/(app)/settings/team/team-client.tsx` (client component extracted
  from current `page.tsx`)
- `src/app/(app)/settings/invites/invites-client.tsx` (same treatment)
- `tests/unit/collaborators.test.ts`
- `tests/integration/team-roles.test.ts`

### Modified
| File | Change |
|-----|-------|
| `src/types/database.ts` | `UserRole`: `"other"` → `"team_member"`; add `AssessmentCollaborator`; `AuditAction` gains `comment_purged`, `collaborator_added`, `collaborator_removed`; remove `assigned_to` from `Assessment` |
| `src/app/(app)/settings/team/page.tsx` | Convert to server component; delegate mutation to `TeamClient` |
| `src/app/(app)/settings/invites/page.tsx` | Same conversion |
| `src/app/(app)/settings/actions.ts` | `updateUserRole` rejects self-assignment and PO-role assignment |
| `src/app/(app)/assessments/page.tsx` | Surface creator name in list rows |
| `src/app/(app)/assessments/[id]/page.tsx` | Surface creator name on header |
| `src/app/(app)/assessments/[id]/threshold/page.tsx` | Pass `readOnly` prop when viewer is `team_member` |
| `src/app/(app)/assessments/[id]/threshold/threshold-form.tsx` | Accept `readOnly` prop; disable inputs + submit |
| `src/app/(app)/assessments/[id]/review/actions.ts` | Add `getCollaborators`, `addCollaborator`, `removeCollaborator`; extend `ReviewBundle` |
| `src/app/(app)/assessments/[id]/review/review-form.tsx` | Render `CollaboratorsPanel` |
| `src/app/(app)/dashboard/page.tsx` | Drop `assigned_to` from `.or()` filter |
| `docs/progress-log.md` | Add Step 5.5 entry |
| `docs/backlog.md` | Close RLS-2/4/6; add newly-surfaced items |
| `docs/security-review.md` | Mark RLS-2/4/6 as `mitigated` |

## 5. Freeze diagnosis

`src/app/(app)/settings/team/page.tsx` currently does:

```tsx
const supabase = createClient();                        // new ref every render
const loadMembers = useCallback(async () => {...}, [supabase]);
useEffect(() => { loadMembers(); }, [loadMembers]);    // fires every render
```

Because `createClient()` returns a fresh object every render, the
`useCallback` memo is invalidated each render, which invalidates the
`useEffect` dependency, which triggers `loadMembers()` → `setMembers(data)` →
re-render → new client → loop.

The freeze is not specific to `project_manager`; it's latent on every team
page load. The user noticed it when trying to update a role because the
update added concurrent fetches on top of the loop.

**Fix**: convert to the Step 5 pattern — page is a server component that
fetches profiles + current user, passes as props to a client component that
calls the server action and `router.refresh()` on success. No `useEffect`,
no client-side fetch, no loop.

## 6. Permission ladder (role-based, global)

| Role             | Threshold edit | Threshold view | Other steps | Status transitions |
|-----------------|---------------|---------------|-------------|-------------------|
| privacy_officer  | ✓             | ✓             | ✓           | all                |
| project_manager  | ✓             | ✓             | ✓           | per Step 5 matrix  |
| team_member      | ✗ (read-only banner) | ✓        | ✓           | per Step 5 matrix  |

Enforced:
- Server action layer: re-read role, early-return on mismatch
- RLS layer: `threshold_insert/update` gated by `can_edit_threshold()`

## 7. Collaborator model

New table:

```sql
CREATE TABLE public.assessment_collaborators (
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (assessment_id, user_id)
);
```

Access rules:
- **Creator** — implicit access via `created_by = auth.uid()`; never appears
  in the join table; cannot be removed.
- **Privacy officer** — implicit access via `is_privacy_officer()`; never
  added as a collaborator (redundant).
- **Collaborator** — row in `assessment_collaborators`; access terminates on
  row delete (next page load).

Writes:
- Only PO can insert/delete join rows.
- Insert/delete blocked when the assessment is archived.

## 8. Migration 00005 SQL

See §9 of the plan file for the full block. Applied manually in Supabase
after chunk 2 commit. Verification queries post-apply:

```sql
SELECT enumlabel FROM pg_enum
  WHERE enumtypid = 'user_role'::regtype ORDER BY enumsortorder;
-- expect: privacy_officer, project_manager, team_member

SELECT column_name FROM information_schema.columns
  WHERE table_name = 'assessments' AND column_name = 'assigned_to';
-- expect: zero rows

SELECT table_name FROM information_schema.tables
  WHERE table_name = 'assessment_collaborators';
-- expect: one row

SELECT tgname FROM pg_trigger
  WHERE tgname IN ('freeze_created_by', 'last_po_guard');
-- expect: two rows
```

## 9. Server actions (plan)

**New (in `review/actions.ts`)**
- `getCollaborators(assessmentId)` — list collaborators with profile fields
- `addCollaborator(assessmentId, userId)` — PO-only; rejects archived; audits
- `removeCollaborator(assessmentId, userId)` — PO-only; rejects archived; audits

**Modified**
- `updateUserRole(userId, role)` in `settings/actions.ts`:
  - Add: reject if `userId === caller.id`
  - Add: reject if `role === 'privacy_officer'`
- `getReviewBundle(assessmentId)`:
  - Add: fetch collaborators, include in bundle
  - Add: compute `canManageCollaborators` (PO + not-archived)
  - Add: compute `canEditThreshold` (role-based)

## 10. UI plan

- **Team page**: two-file split — `page.tsx` (server) fetches profiles +
  currentUserId; `team-client.tsx` renders list and calls `updateUserRole`.
- **Invites page**: same pattern.
- **Assessments list** (`/assessments`): already joins creator profile; render
  "by X" in each row.
- **Assessment header** (`/assessments/[id]`): fetch + render creator.
- **Threshold page**: new `<Banner>` above form when viewer is `team_member`;
  form inputs receive `readOnly` prop.
- **Review page**: new `CollaboratorsPanel` on the right column:
  - Always shows the list with avatar + display_name
  - PO also sees "Add collaborator" dropdown + remove-X button
  - All controls disabled with tooltip if assessment is archived

## 11. Tests

**Unit (`tests/unit/collaborators.test.ts`)**
- Collab add/remove payload validation
- Role-based threshold edit gate (pure helper extracted from action)

**Integration (`tests/integration/team-roles.test.ts`)**
- Enum renamed: insert/select with `team_member` value works
- `updateUserRole` rejects PO-role assignment
- `updateUserRole` rejects self-assignment
- `last_po_guard`: demoting last PO raises exception
- `freeze_created_by`: mutating `created_by` raises exception
- Collaborator add → appears in `assessment_collaborators`
- Collaborator delete → removes row
- team_member cannot INSERT into `threshold_checks` (RLS)

Skip with `describe.skipIf(!hasEnv)` as per Step 5 pattern.

## 12. Security

Step 5.5 closes three open RLS findings:

| Finding | Fix |
|--------|----|
| RLS-2 ownership transfer | `BEFORE UPDATE` trigger `freeze_created_by` rejects `NEW.created_by IS DISTINCT FROM OLD.created_by` |
| RLS-4 hard-delete bypass | `comments_delete` policy → `USING (is_privacy_officer())`; app uses soft-delete path for normal users |
| RLS-6 last-PO demote | `BEFORE UPDATE` trigger `last_po_guard` rejects demotion when PO count ≤ 1 |

New threat surface:
- **Collaborator spoofing**: `addCollaborator` action re-reads caller role;
  RLS `collab_insert` requires `is_privacy_officer()`.
- **Threshold role spoofing**: `can_edit_threshold()` is SECURITY DEFINER and
  re-reads the caller's role.

Unchanged from Step 5:
- Audit log append-only
- No `dangerouslySetInnerHTML`
- Server actions never trust client-supplied role

## 13. Verification smoke tests (post-PR-merge, browser at https://pia-web-app.vercel.app)

Setup: two accounts (PO + team_member) plus a third (project_manager) if
available. One test assessment per scenario.

| # | Test | Expected |
|---|------|----------|
| 5.5.1 | PO opens Team page; selects `project_manager` for a user | Role saves; no freeze |
| 5.5.2 | PO dropdown options | `privacy_officer` not present |
| 5.5.3 | PO's own row on Team page | No dropdown (self-assignment blocked) |
| 5.5.4 | team_member opens threshold page | Form read-only; banner visible; no save button |
| 5.5.5 | project_manager opens threshold page | Fully editable |
| 5.5.6 | PO on review page → add collaborator | User appears in panel; sees PIA in dashboard |
| 5.5.7 | PO removes collaborator | User loses access on next page load |
| 5.5.8 | PO opens archived PIA → collab panel | Add/remove disabled with tooltip |
| 5.5.9 | Assessment header | "Created by X" visible |
| 5.5.10 | Assessments list | "by X" in each row |
| 5.5.11 | PO tries to self-demote via team page | Dropdown hidden; last-PO guard blocks backdoor attempts |
| 5.5.12 | PO hard-delete attempt via JS client on comment | RLS allows; audit action path writes `comment_purged` |

## 14. Known issues / revisit list

- team_member creators cannot edit threshold on PIAs they themselves created.
  This is intentional (role-based model) but may surface as UX friction.
  Revisit if live users complain; consider per-PIA override later.
- `comment_purged` audit type is in the vocabulary but no UI triggers it yet
  (PO hard-delete is RLS-allowed but action not wired); revisit in a future
  compliance-flow chunk.
- `assignees` vs `collaborators` terminology — we standardised on
  "collaborators". If the UI ever surfaces "assigned to X", reconcile.
- Email notifications on collab add still deferred to backlog.

## 15. Chunk commit plan

Ten small chunks, each one isolated capability, one commit per chunk on
`claude/review-and-plan-BqrRI`:

| # | Ships | Pause? |
|---|------|--------|
| 1 | Docs skeleton (this note + progress-log + backlog) | No |
| 2 | Migration `00005_roles_and_collaborators.sql` | **YES — user runs in Supabase** |
| 3 | TypeScript types | No |
| 4 | Team page freeze fix + `updateUserRole` hardening | No |
| 5 | Invites page freeze fix + label update | No |
| 6 | Creator name on header + list | No |
| 7 | Collaborator server actions + `getReviewBundle` update | No |
| 8 | Collab panel UI + threshold read-only banner | No |
| 9 | Unit + integration tests | No |
| 10 | Progress-log + backlog + security-review wrap + push + PR #9 | No |

## 16. Deployment flow

Push commits to `claude/review-and-plan-BqrRI`; after chunk 10, open **PR #9**
(`claude/review-and-plan-BqrRI` → `main`); user reviews + merges; Vercel
auto-deploys; user runs §13 smoke tests; I log outcomes in `progress-log.md`
under the verification / deployed sub-bullets.

---

**Sign-off** — 2026-04-19 — approved by user; chunk 1 in progress.
