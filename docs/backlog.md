# PIA Web App — Backlog

Parked items, grouped by step. Each bullet has a `[added YYYY-MM-DD]` stamp.
This list will grow as rigorous live-env testing uncovers issues.

---

## Cross-cutting

- **Rigorous live-env testing required, ongoing** — smoke tests after each deploy; backlog grows from findings. [added 2026-04-19]
- **Notifications** — `notifications` table exists but nothing writes to it yet; wire status-change and comment-added notifications once the review workflow is stable. [added 2026-04-19]
- **Naming reconciliation** — `profiles.display_name` vs spec term "full_name"; normalise terminology across docs and UI copy. [added 2026-04-19]
- **Playwright E2E coverage** — infra is installed; no E2E suites yet for any step. [added 2026-04-19]

## Step 5 — Review / approval

- **Completeness-check rules are loose** — current check requires threshold row with non-pending result, at least one data flow, all 13 APP rows present, at least one risk. Revisit thresholds and copy after live-env testing with real users. [added 2026-04-19]
- **Comment editing** — not supported; only delete. Consider edit-in-place with an "edited" marker. [added 2026-04-19]
- **Comment threading / replies** — schema has no `parent_id`; flat list only. Add parent_id + nested rendering if users request it. [added 2026-04-19]
- **Section-tag jump links** — comment section tags render as badges; in a later step turn them into links to the tagged step page. [added 2026-04-19]
- **Rich text in comments** — plain text only for now. [added 2026-04-19]

## Step 6 — Report generation

- **Word export styling / branding** — initial report ships plain; add OAIC-aligned branding, header/footer, logo, cover page in a follow-up. [added 2026-04-19]
- **Print stylesheet polish** — browser print will work via `window.print()`; dedicated print CSS (page breaks, hidden chrome) comes after baseline ships. [added 2026-04-19]

## Pre-existing lint issues (found during Step 5 chunk 3 type-check)

- `src/app/(app)/settings/invites/page.tsx:44` — `loadInvites()` called synchronously inside `useEffect`; flagged by `react-hooks/set-state-in-effect`. [added 2026-04-19]
- `src/app/(app)/settings/team/page.tsx:43` — same pattern (`loadMembers()` in effect). [added 2026-04-19]
- `src/app/(app)/settings/team/page.tsx:5` — unused `Button` import. [added 2026-04-19]

Not blocking Step 5; fix in a follow-up pass over settings pages.

## Security & operations

- **Broader RLS audit** — initial findings will land in `docs/security-review.md` during Step 5 chunk 1; re-audit whenever new tables land. [added 2026-04-19]
- **Rate limiting / abuse prevention** — nothing in place on comment submission or status toggling; consider Supabase edge rate limits or middleware. [added 2026-04-19]
