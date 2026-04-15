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
  const { count } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const isFirstUser = count === 0;

  if (!isFirstUser && !inviteCode) {
    return { error: "An invite code is required to sign up." };
  }

  // If invite code provided, validate it
  if (inviteCode) {
    const { data: invite } = await supabase
      .from("invites")
      .select("*")
      .eq("code", inviteCode)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!invite) {
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

  // If invite code was used, mark it as accepted
  if (inviteCode) {
    const { data: user } = await supabase.auth.getUser();
    if (user?.user) {
      await supabase
        .from("invites")
        .update({ status: "accepted", accepted_by: user.user.id })
        .eq("code", inviteCode);
    }
  }

  redirect("/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
