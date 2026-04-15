"use client";

import { createBrowserClient } from "@supabase/ssr";

// Database types are applied at the point of use via type assertions.
// Once Supabase is running, generate proper types with: supabase gen types typescript
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
