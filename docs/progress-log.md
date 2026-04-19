# PIA Web App — Progress Log

One entry per build step. Each entry uses dated sub-bullets for the lifecycle
stages: **concept → design → code → verification → deployed**.

Numbering follows the order things were built, not the OAIC 10-step model.
OAIC alignment is tracked in `CLAUDE.md` and in each step's design note.

---

## Step 0 — Project foundations (auth, schema, onboarding, invites)

Backfilled from git history as one-liners; not a single discrete session.

- **concept** — 2026-04-14 — Project brief captured in `CLAUDE.md`: Next.js App Router + Supabase + RLS + role-based access for a PIA tool aligned to OAIC guidance.
- **design** — 2026-04-15 — Initial schema drafted (`profiles`, `assessments`, per-step tables, `comments`, `audit_log`, `notifications`), RLS helpers `is_privacy_officer()` and `can_access_assessment()`.
- **code** — 2026-04-15 — Phase 1 scaffold: Next.js app, Supabase client (server + browser variants), auth routes, invite system, role-based dashboard; first-user becomes privacy officer.
- **code** — 2026-04-15 — Invite flow hardened (optional invite code, awaiting-approval gate, trigger-based validation, fixes for unauthenticated signup edge cases).
- **code** — 2026-04-16 — Email dispatch for invites via Resend.
- **verification** — 2026-04-15 — Unit tests for threshold scoring + integration tests for auth added (vitest + playwright infra).
- **deployed** — Vercel + Supabase live at https://pia-web-app.vercel.app.

## Step 1 — Threshold assessment

- **concept** — 2026-04-15 — OAIC-aligned screening gate to decide if a full PIA is required.
- **design** — 2026-04-15 — 10 screening questions, result enum (`full_pia_required`, `pia_recommended`, `not_required`, `pending`); added `pia_recommended` in migration `00002`.
- **code** — 2026-04-15 — `src/app/(app)/assessments/[id]/threshold/` with server page + client form + actions.
- **code** — 2026-04-16 — UI redesign for clarity and compactness.
- **verification** — Unit tests for scoring in `src/__tests__/threshold.test.ts`.
- **deployed** — Live on Vercel.

## Step 2 — Data flow mapping

- **concept** — 2026-04-16 — Capture how personal information moves through the project (collection, storage, sharing, retention, disposal).
- **design** — 2026-04-16 — `data_flows` table with both form and visual editor preference per user (`data_flow_preference` on profile).
- **code** — 2026-04-16 — Server page + form in `src/app/(app)/assessments/[id]/data-flow/`.
- **deployed** — Live on Vercel.

## Step 3 — APP compliance analysis

- **concept** — 2026-04-16 — Per-principle compliance check across the 13 Australian Privacy Principles.
- **design** — 2026-04-16 — `app_analyses` table keyed `(assessment_id, app_number)`, branching questionnaire with `responses` JSONB, `compliance_status` enum, findings + recommendations + AI suggestion slot.
- **code** — 2026-04-16 — Server page + form in `src/app/(app)/assessments/[id]/app-analysis/`; APP definitions in `src/lib/app-definitions.ts`.
- **deployed** — Live on Vercel.

## Step 4 — Risk register

- **concept** — 2026-04-17 — Risk register scored on likelihood × consequence with auto-suggestions from prior steps.
- **design** — 2026-04-17 — `risks` table with generated `risk_score` column; residual scoring; category; status enum; AI-suggested flag.
- **code** — 2026-04-17 — Server page + form + interactive matrix in `src/app/(app)/assessments/[id]/risks/`; suggestions helper in `src/lib/risk-suggestions.ts`.
- **deployed** — Live on Vercel.

## Step 5 — Review / approval workflow

**In progress** — see `docs/steps/step-05-review.md` for full design note.

- **concept** — 2026-04-19 — Collaborative review with comments, status transitions (draft → in_review → approved → archived), audit trail.
- **design** — 2026-04-19 — Design note drafted and signed off; decisions include soft-delete for comments, snake_case stored section tags with descriptive display labels, role-gated status transitions enforced server-side, filter-by-action audit log UI.
- **code** — 2026-04-19 — Chunk 1 (docs skeleton) committed. Chunk 2 (migration `00004_comment_soft_delete.sql`) committed and applied in Supabase (verified via `information_schema`). Chunk 3 (server actions + pure helpers) committed: new `completeness`, `section-labels`, `format-time`, `review-transitions` libs; `review/actions.ts` rewritten with role-gated transitions, audit-log writes, and comment soft-delete. Chunk 4 (UI) committed: `page.tsx`, `review-form.tsx`, `status-controls.tsx`, `comments-panel.tsx`, `audit-log.tsx`; added `isSummaryComplete` helper for the bundle-shaped fetch. Chunk 5 (tests) committed: 71 unit tests across `completeness`, `review-transitions`, `section-labels`, `format-time`; one integration suite in `tests/integration/review-workflow.test.ts` (single-account soft-delete + audit-log flow; skips cleanly if env not set). Two-account RLS integration tests deferred to backlog. Chunk 6 (review wrap) committed: env-var audit (pass), broader RLS audit logged in `docs/security-review.md` with six findings (RLS-1 high, RLS-2/3/4 medium, RLS-5/6 low; RLS-3 + RLS-5 accepted, the remaining four queued in `docs/backlog.md` under Security & operations). Step 5 is code-complete on `claude/review-and-plan-BqrRI`; PR opened for review + merge.
- **verification** — _pending_ — Smoke tests listed in §13 of the design note. To run post-merge against https://pia-web-app.vercel.app once Vercel re-deploys.
- **deployed** — _pending_ — Awaiting PR merge and Vercel deploy.

## Step 5.5 — Team & collaborator management

**In progress** — see `docs/steps/step-05-5-team.md` for full design note.

- **concept** — 2026-04-19 — Follow-up from Step 5 live-env testing. Two issues surfaced: PO cannot assign roles on the Team page (browser freezes silently when a role is selected); PO cannot see who created each PIA or add users to contribute. Scope also bundles RLS-2, RLS-4, and RLS-6 fixes from the Step 5 security review into a single migration.
- **design** — 2026-04-19 — Design note drafted and signed off. Key decisions: rename enum `other` → `team_member`; role-based permissions (team_member cannot edit threshold anywhere, even on own PIAs); new `assessment_collaborators` join table with PO-only write; deprecate `assigned_to` (migrate + drop); creator name on assessment header and assessments list; collaborator panel inline on review page; profile dropdown picker; archived PIAs block collab changes; single migration `00005_roles_and_collaborators.sql`. Ten-chunk commit plan for small-PR workflow; PR #9 at end.
- **code** — _pending_ — chunk 1 (docs skeleton) in progress.
- **verification** — _pending_ — smoke tests 5.5.1–5.5.12 in §13 of the design note.
- **deployed** — _pending_.

## Step 6 — Report generation (OAIC structure + Word export)

**Not started** — priority 3 per handover brief.

- Planned: on-screen OAIC-structured report (Executive Summary → Conclusion + audit log appendix); Word export via `docx` npm package client-side; print via browser.
- Styling / branding deferred to backlog.
