# PIA Web App — Security Review

Rolling record of security reviews. New findings append with a date stamp and
status (`open`, `mitigated`, `accepted`, `wontfix`).

Scope expands as new tables/routes/actions land; this document is the single
source of truth for the security posture.

---

## Review 2026-04-19 — Step 5 chunk 1 + chunk 6 findings

**Scope**: broader RLS audit across all tables, env-var leak scan, threat
review for the new review/approval workflow.
**Status**: completed.

### Env-var audit — PASS

| Check | Result |
|------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` referenced in `src/` | Not found |
| `service_role` token anywhere in `src/` | Not found |
| Non-public env vars exposed via `NEXT_PUBLIC_` | None. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `RESEND_API_KEY` reachable from client | No — only imported by `src/app/(app)/settings/actions.ts` (server action) |
| `.env`, `.env.local`, `.env.test` present in git history | None tracked (only `.env.local.example` and `.env.test.example`) |
| `.gitignore` covers env files | Yes: `.env*` ignored, `!.env*.example` whitelist |

No findings.

### RLS audit

Reviewed: `profiles`, `invites`, `assessments`, `threshold_checks`, `data_flows`,
`app_analyses`, `risks`, `comments`, `audit_log`, `notifications`.

Shorthand: **sev** = severity (high / medium / low). All findings are **open**
unless marked otherwise.

#### RLS-1 — `notifications_insert WITH CHECK (true)` | sev: high | status: open

Any authenticated user can insert a notification row targeting any other user's
`user_id`. Enables in-app notification spam or social-engineering payloads
appearing in a victim's notification feed.

**Why it's there**: notifications aren't wired yet; the permissive policy was
probably a placeholder so a server-side trigger could later emit rows.

**Recommended fix**: tighten to `WITH CHECK (user_id = auth.uid())` for
self-notifications, and dispatch cross-user notifications via a
`SECURITY DEFINER` helper function or a DB trigger on the source table (comment
or status change), never via client-side insert.

**Action**: fold into the notifications wiring work (see backlog). Not blocking
Step 5 because no code inserts notifications yet, but should be fixed before the
first notification writer ships.

#### RLS-2 — `assessments_update` allows ownership transfer | sev: medium | status: mitigated (2026-04-20, migration 00005)

```
USING (is_privacy_officer() OR created_by = auth.uid() OR assigned_to = auth.uid())
-- no WITH CHECK clause
```

An assignee can mutate any column of an assessment they can read, including
`created_by` and `assigned_to`. They could transfer ownership to themselves or
re-assign an assessment to a third party.

**Recommended fix**: add a `WITH CHECK` clause that freezes ownership columns
unless the actor is a privacy officer:

```sql
ALTER POLICY assessments_update ON public.assessments
  WITH CHECK (
    is_privacy_officer()
    OR (created_by = (SELECT created_by FROM public.assessments WHERE id = assessments.id))
  );
```

(Exact formulation needs testing — the subquery form is illustrative.)

**Action**: track in backlog for a follow-up migration. Not in Step 5 scope.

**Mitigation (2026-04-20, migration 00005)**: a `BEFORE UPDATE` trigger
`freeze_created_by` on `public.assessments` rejects any update where
`NEW.created_by IS DISTINCT FROM OLD.created_by`. `assigned_to` column
removed entirely; access is now via `assessment_collaborators` (PO-only
writes), so the attack surface is gone.

#### RLS-3 — `profiles_select USING (true)` exposes all emails | sev: medium | status: accepted

Every authenticated user can read every other profile's `email` column. For a
single-organisation tool this is arguably expected (invites and directories),
but if the product grows to multi-tenant it becomes a leak.

**Recommended fix (future)**: restrict to `display_name` only for non-PO users,
or split sensitive columns into a separate table.

**Action**: accept for now; revisit if multi-tenant requirements surface.

#### RLS-4 — `comments_delete` allows hard delete, bypassing soft-delete | sev: medium | status: mitigated (2026-04-20, migration 00005)

Migration 00004 introduced `deleted_at` to support soft deletion, and the app's
`deleteComment` action performs an `UPDATE`. However the existing policy
`comments_delete FOR DELETE USING (user_id = auth.uid())` still allows a user
to directly hard-delete their own comments via the Supabase JS client,
bypassing the audit log entry the server action writes.

**Recommended fix**: add a follow-up migration that replaces the DELETE policy
with `FOR DELETE USING (false)` (or drops it), forcing the soft-delete path:

```sql
DROP POLICY comments_delete ON public.comments;
-- Optional: keep a PO-only delete for compliance erasure requests.
CREATE POLICY comments_delete ON public.comments
  FOR DELETE USING (is_privacy_officer());
```

**Action**: backlog — schedule `00005_comments_soft_delete_only.sql`.

**Mitigation (2026-04-20, migration 00005)**: `comments_delete` policy
rewritten to `FOR DELETE USING (is_privacy_officer())`. Normal users
can only soft-delete via the update path; hard delete is reserved for
privacy officers (compliance / erasure). The `comment_purged` audit
action vocabulary is in place for when UI exposes the PO hard-delete.

#### RLS-5 — soft-deleted comments remain SELECT-visible | sev: low | status: accepted

A user with `can_access_assessment` can still SELECT soft-deleted rows (the
policy doesn't filter on `deleted_at`). The app filters `deleted_at IS NULL`
in queries, but a custom client could bypass that.

**Why accepted**: this is useful for audit forensics — the `audit_log.details`
records `comment_id`, so retrieving the deleted body during an investigation
has value. Exposing this to regular users rather than only to privacy officers
is borderline, but changing it would complicate the audit trail.

**Action**: document. If this becomes a concern, split SELECT into two
policies: "active rows to anyone with access" + "deleted rows to PO only".

#### RLS-6 — privacy officer can self-demote; no last-PO guard | sev: low | status: mitigated (2026-04-20, migration 00005)

`profiles_update USING (id = auth.uid() OR is_privacy_officer())` plus no
CHECK on the `role` column means the sole privacy officer can change their
own role to `other`, leaving the organisation with no PO. There is no
recovery path except the first-user-bootstrap, which only fires when profile
count is zero.

**Recommended fix**: add a `BEFORE UPDATE` trigger on `profiles` that rejects
role changes that would drop the PO count to zero, or enforce it in the update
server action.

**Action**: backlog.

**Mitigation (2026-04-20, migration 00005)**: `BEFORE UPDATE` trigger
`last_po_guard` on `public.profiles` raises if demoting would drop PO
count to zero. UI belt-and-braces: team page hides the role <select>
for the caller's own row and for rows already holding the PO role; the
`updateUserRole` server action rejects self-assignment and
`privacy_officer` targets.

### Audit log — PASS

- `audit_log` has SELECT + INSERT policies only; no UPDATE or DELETE policies exist, so the table is append-only by RLS. Verified by the `review-workflow.test.ts` integration test (`UPDATE` returns zero rows).
- INSERT enforces `user_id = auth.uid()` — a user cannot forge entries as another user. Verified by the same test.
- SELECT gated by `is_privacy_officer() OR can_access_assessment(assessment_id)` — PO sees everything, others see audit entries for assessments they can access.

### Known principles (for reference)

- Every server action re-checks role and access; UI state is never trusted
- Role changes are gated by `is_privacy_officer()` SQL helper (re-reads `profiles.role`)
- Soft-deleted comments filtered in SQL, never in the browser (but see RLS-5)
- Audit log is append-only; no update/delete actions exposed from the app
- Free-text bodies rendered via default React escaping; no `dangerouslySetInnerHTML`
- No service-role key in client code; client uses anon key + RLS only

### Findings log summary

| ID     | Title                                               | Sev    | Status    |
|--------|-----------------------------------------------------|--------|-----------|
| RLS-1  | `notifications_insert` accepts any recipient        | high   | open      |
| RLS-2  | `assessments_update` allows ownership transfer      | medium | mitigated |
| RLS-3  | `profiles_select` exposes emails                    | medium | accepted  |
| RLS-4  | `comments_delete` bypasses soft-delete              | medium | mitigated |
| RLS-5  | Soft-deleted comments visible to all accessors      | low    | accepted  |
| RLS-6  | PO can self-demote; no last-PO guard                | low    | mitigated |

Open findings tracked in `docs/backlog.md` under "Security & operations".

---

## Review 2026-04-20 — Step 5.5 follow-ups

**Scope**: migration `00005_roles_and_collaborators.sql` (enum rename,
collaborators join table, RLS-2/4/6 fixes, threshold-edit gate) and the
associated client + server changes.

### Changes

- RLS-2, RLS-4, RLS-6 mitigated — see entries above for details.
- New table `public.assessment_collaborators` with RLS:
  - `collab_select`: PO, the collaborator themselves, or the assessment
    creator can see rows.
  - `collab_insert` / `collab_delete`: PO only, and blocked on archived
    assessments.
- `can_access_assessment(id)` rewritten as a union of PO /
  creator / collaborator — single source of truth; `assessments` +
  `threshold_checks` policies now reference it.
- New `can_edit_threshold()` SQL helper gates `threshold_checks` INSERT
  and UPDATE to `privacy_officer` or `project_manager`. TypeScript
  mirror in `src/lib/threshold-permissions.ts` keeps the UI aligned.
- `updateUserRole` server action hardened: rejects self-assignment and
  any attempt to set `privacy_officer` from the team page.

### New threat surface

- **Collaborator spoofing** — mitigated: the `collab_insert` policy
  re-checks `is_privacy_officer()` so a non-PO cannot forge a row even
  if the server action is bypassed.
- **Threshold role spoofing** — mitigated: the RLS-layer
  `can_edit_threshold()` function is `SECURITY DEFINER STABLE` and
  re-reads the caller's role from `profiles`.

### Still open

- RLS-1 (high) remains the top outstanding item. Not in Step 5.5 scope;
  belongs to the notifications wiring work.
