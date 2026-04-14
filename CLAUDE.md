# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PIA Web App — a Privacy Impact Assessment tool for Australian organisations, aligned with the OAIC PIA Guide and the Australian Privacy Act 1988 / Australian Privacy Principles (APPs). Single-org tool with role-based onboarding (privacy officer, project manager, etc.), collaborative assessments, and AI-assisted risk suggestions.

## Planned Tech Stack

- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** Supabase (Postgres + Auth + Row Level Security)
- **Auth:** Email/password via Supabase Auth
- **Report export:** Word (.docx) download + on-screen summary
- **Deployment:** Local development first, then Vercel + Supabase hosted

## Build & Dev Commands

```bash
npm install          # install dependencies
npm run dev          # start dev server (Next.js, usually localhost:3000)
npm run build        # production build
npm run lint         # ESLint
npm run test         # run test suite
npm run test -- --watch  # run tests in watch mode
```

## Architecture (Planned)

### Assessment Flow (OAIC 10-Step Process)

1. **Onboarding** — role selection (privacy officer / project manager / other) customises the UI and question framing
2. **Threshold assessment** — short screening to decide if a full PIA is needed
3. **Full PIA** — project description, data flow mapping, APP-by-APP analysis (13 APPs), risk register (likelihood × consequence matrix)
4. **Review/approval workflow** — collaborative with comments
5. **Report generation** — on-screen view + Word export following OAIC report structure

### Key Domain Concepts

- **Assessment** — a single PIA tied to a project/initiative, with status (draft → in-review → approved → archived)
- **Threshold check** — lightweight gate before full PIA
- **Risk register** — risks scored on likelihood × consequence, with suggested mitigations
- **APP analysis** — per-principle compliance check across all 13 Australian Privacy Principles
- **Dashboard** — privacy officers see all assessments org-wide; other users see their own

### Role-Based Access

- **Privacy officer** — full dashboard, all assessments, approval authority, org settings
- **Project manager / other roles** — create and manage own assessments, limited view

### Supabase / Database

- Row Level Security (RLS) policies enforce role-based access
- Tables: users, assessments, threshold_checks, app_analyses, risks, comments, notifications
- Supabase client initialised in `lib/supabase/` with server and client variants

## Key Conventions

- App Router file conventions: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- Server components by default; `"use client"` only when needed for interactivity
- Database queries via Supabase JS client, not raw SQL in components
- shadcn/ui components added via `npx shadcn-ui@latest add <component>`
- Environment variables in `.env.local` (never committed): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
