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
- **code** — 2026-04-19 — Chunk 1 (docs skeleton) committed. Chunk 2 (migration `00004_comment_soft_delete.sql`) committed; paused waiting for user to apply it in Supabase dashboard before proceeding to chunks 3–6.
- **verification** — _pending_ — Smoke tests listed in §13 of the design note.
- **deployed** — _pending_.

## Step 6 — Report generation (OAIC structure + Word export)

**Not started** — priority 3 per handover brief.

- Planned: on-screen OAIC-structured report (Executive Summary → Conclusion + audit log appendix); Word export via `docx` npm package client-side; print via browser.
- Styling / branding deferred to backlog.
