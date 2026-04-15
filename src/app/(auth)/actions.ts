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

  // Verify invite code or check if this is the first user
  const { count, error: countError } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  // count is null if query fails or RLS blocks it — treat null/0 as first user
  const isFirstUser = countError || count === null || count === 0;

  if (!isFirstUser && !inviteCode) {
    return { error: "An invite code is required to sign up." };
  }

  // If invite code provided, validate it via SECURITY DEFINER function
  // (anon users can't read the invites table directly due to RLS)
  if (inviteCode) {
    const { data: invite, error: inviteError } = await supabase
      .rpc("validate_invite_code", { invite_code: inviteCode });

    if (inviteError || !invite || invite.length === 0) {
      return { error: "Invalid or expired invite code." };
    }
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If invite code was used, mark it as accepted via SECURITY DEFINER function
  if (inviteCode) {
    const { data: user } = await supabase.auth.getUser();
    if (user?.user) {
      await supabase.rpc("accept_invite", {
        invite_code: inviteCode,
        user_uuid: user.user.id,
      });
    }
  }

  redirect("/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
