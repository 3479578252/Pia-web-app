# PIA Web App

Privacy Impact Assessment tool for Australian organisations, aligned with the OAIC PIA Guide and the Australian Privacy Act 1988 / Australian Privacy Principles (APPs).

## Setup

```bash
npm install
cp .env.local.example .env.local
# Edit .env.local with your Supabase project credentials
npm run dev
```

## Tech Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Postgres + Auth + Row Level Security)
