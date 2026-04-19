# PIA Web App — Security Review

Rolling record of security reviews. New findings append with a date stamp and
status (`open`, `mitigated`, `accepted`, `wontfix`).

Scope expands as new tables/routes/actions land; this document is the single
source of truth for the security posture.

---

## Review 2026-04-19 — Step 5 chunk 1 review

**Scope**: broader RLS audit across all tables + env-var leak scan.
**Status**: _pending_ — findings will be appended in chunk 6 of Step 5.

### Env-var audit checklist (to be run in chunk 1)

- [ ] Scan codebase for `SUPABASE_SERVICE_ROLE_KEY` references in client components (anything under `"use client"`)
- [ ] Verify only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` reach the browser bundle
- [ ] Check git history for accidentally committed `.env*` files
- [ ] Verify Resend API key is server-only
- [ ] Confirm `.env.local` is in `.gitignore`

### RLS audit checklist (to be run in chunk 1)

Tables to re-audit against the role model:

- [ ] `profiles` — select-all policy; confirm no sensitive columns leak
- [ ] `invites` — PO-only writes; PO or invited email can read
- [ ] `assessments` — PO sees all; users see own/assigned
- [ ] `threshold_checks` — follows `can_access_assessment`
- [ ] `data_flows` — follows `can_access_assessment`
- [ ] `app_analyses` — follows `can_access_assessment`
- [ ] `risks` — follows `can_access_assessment`
- [ ] `comments` — select via access, write requires own row; soft-delete path in Step 5 preserves these guarantees
- [ ] `audit_log` — append-only; select gated by access
- [ ] `notifications` — own-row only

### Known principles (for reference)

- Every server action re-checks role and access; UI state is never trusted
- Role changes are gated by `is_privacy_officer()` SQL helper (re-reads `profiles.role`)
- Soft-deleted comments filtered in SQL, never in the browser
- Audit log is append-only; no update/delete actions exposed from the app
- Free-text bodies rendered via default React escaping; no `dangerouslySetInnerHTML`
- No service-role key in client code; client uses anon key + RLS only

### Findings log

_(empty — populated after chunk 1 audit)_
