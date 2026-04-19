# PIA Web App — Backlog

Parked items, grouped by step. Each bullet has a `[added YYYY-MM-DD]` stamp.
This list will grow as rigorous live-env testing uncovers issues.

---

## Cross-cutting

- **Rigorous live-env testing required, ongoing** — smoke tests after each deploy; backlog grows from findings. [added 2026-04-19]
- **Notifications** — `notifications` table exists but nothing writes to it yet; wire status-change and comment-added notifications once the review workflow is stable. [added 2026-04-19]
- **Naming reconciliation** — `profiles.display_name` vs spec term "full_name"; normalise terminology across docs and UI copy. [added 2026-04-19]
- **Playwright E2E coverage** — infra is installed; no E2E suites yet for any step. [added 2026-04-19]
- **Two-account RLS integration tests** — current review-workflow integration test uses a single account; role-based tests (non-PO blocked from approve, cross-user comment delete blocked, archived-assessment write-blocks) need a second account. Add `TEST_PO_EMAIL` / `TEST_NON_PO_EMAIL` env pair and a dedicated test suite. [added 2026-04-19]

## Step 5 — Review / approval

- **Completeness-check rules are loose** — current check requires threshold row with non-pending result, at least one data flow, all 13 APP rows present, at least one risk. Revisit thresholds and copy after live-env testing with real users. [added 2026-04-19]
- **Comment editing** — not supported; only delete. Consider edit-in-place with an "edited" marker. [added 2026-04-19]
- **Comment threading / replies** — schema has no `parent_id`; flat list only. Add parent_id + nested rendering if users request it. [added 2026-04-19]
- **Section-tag jump links** — comment section tags render as badges; in a later step turn them into links to the tagged step page. [added 2026-04-19]
- **Rich text in comments** — plain text only for now. [added 2026-04-19]

## Step 5.5 — Team & collaborator management

- **Email notification on collaborator add** — silent for now per spec; wire Resend when notifications layer lands. [added 2026-04-19]
- **PO hard-delete UI for comments** — RLS-4 fix allows PO to hard-delete; no UI exposes it yet. Add a compliance / erasure button on PO review view when the flow is needed; `comment_purged` audit action already in the vocabulary. [added 2026-04-19]
- **team_member creator UX friction** — a team_member who creates a PIA still cannot edit the threshold on that PIA (role-based, not per-PIA). Revisit if live testing surfaces friction; possible per-PIA override. [added 2026-04-19]

## Step 6 — Report generation

- **Word export styling / branding** — initial report ships plain; add OAIC-aligned branding, header/footer, logo, cover page in a follow-up. [added 2026-04-19]
- **Print stylesheet polish** — browser print will work via `window.print()`; dedicated print CSS (page breaks, hidden chrome) comes after baseline ships. [added 2026-04-19]

## Pre-existing lint issues (found during Step 5 chunk 3 type-check)

- `src/app/(app)/settings/invites/page.tsx:44` — `loadInvites()` called synchronously inside `useEffect`; flagged by `react-hooks/set-state-in-effect`. [added 2026-04-19]
- `src/app/(app)/settings/team/page.tsx:43` — same pattern (`loadMembers()` in effect). [added 2026-04-19]
- `src/app/(app)/settings/team/page.tsx:5` — unused `Button` import. [added 2026-04-19]

Not blocking Step 5; fix in a follow-up pass over settings pages.

## Pre-existing build issues (found during Step 5 chunk 4 `next build`)

- `src/app/awaiting-approval/page.tsx` calls `createClient()` at render time; static generation without Supabase env vars throws "Your project's URL and API key are required". Production (Vercel) has envs so builds pass there, but local `next build` fails without `.env.local`. Fix: either force the page to be dynamic (`export const dynamic = 'force-dynamic'`) or guard the client creation behind a runtime check. [added 2026-04-19]

## Security & operations

- **Broader RLS audit** — initial findings captured in `docs/security-review.md` (Review 2026-04-19); re-audit whenever new tables land. [added 2026-04-19]
- **Rate limiting / abuse prevention** — nothing in place on comment submission or status toggling; consider Supabase edge rate limits or middleware. [added 2026-04-19]
- **RLS-1 (high) — `notifications_insert WITH CHECK (true)`** — any authenticated user can target any `user_id`. Tighten to `user_id = auth.uid()` and route cross-user notifications through a `SECURITY DEFINER` helper or trigger. Must ship before the first notification writer. [added 2026-04-19]
- **RLS-2 (medium) — `assessments_update` allows ownership transfer** — no `WITH CHECK` clause; an assignee can mutate `created_by` / `assigned_to`. Add a CHECK that freezes ownership columns for non-PO actors. [added 2026-04-19]
- **RLS-4 (medium) — `comments_delete` bypasses soft-delete** — the existing FOR DELETE policy still permits hard delete via the JS client, skipping the audit-log entry. Schedule `00005_comments_soft_delete_only.sql` to drop/restrict the policy (PO-only for erasure requests). [added 2026-04-19]
- **RLS-6 (low) — PO can self-demote; no last-PO guard** — `profiles_update` has no CHECK on `role`, so the sole PO can orphan the org. Add a `BEFORE UPDATE` trigger rejecting role changes that drop PO count to zero. [added 2026-04-19]
