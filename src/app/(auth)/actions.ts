"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const displayName = formData.get("display_name") as string;
  const inviteCode = formData.get("invite_code") as string | null;

  // Check if this is the first user (no profiles yet)
  const { count, error: countError } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const isFirstUser = countError || count === null || count === 0;

  if (!isFirstUser && !inviteCode) {
    return { error: "An invite code is required to sign up." };
  }

  // Sign up and pass invite_code + display_name via user metadata.
  // The handle_new_user() database trigger validates the invite code,
  // assigns the role, and marks the invite as accepted — all within
  // the trigger's SECURITY DEFINER context (no RLS bypass needed in app code).
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        invite_code: inviteCode || undefined,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
