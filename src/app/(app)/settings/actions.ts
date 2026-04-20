"use server";

import { createClient } from "@/lib/supabase/server";
import { nanoid } from "@/lib/nanoid";
import { sendInviteEmail } from "@/lib/email";
import { headers } from "next/headers";
import type { UserRole } from "@/types/database";

export async function createEmailInvite(email: string, role: UserRole) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Check caller is privacy officer
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "privacy_officer") return { error: "Unauthorized" };

  const code = nanoid(12);

  const { error } = await supabase.from("invites").insert({
    email,
    code,
    role,
    status: "pending",
    invited_by: user.id,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  if (error) return { error: error.message };

  // Send invite email
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const appUrl = `${protocol}://${host}`;

  const emailResult = await sendInviteEmail({
    to: email,
    inviteCode: code,
    role,
    invitedByName: profile?.display_name || "Your Privacy Officer",
    appUrl,
  });

  if (emailResult.error) {
    return { code, emailError: emailResult.error };
  }

  return { code, emailSent: true };
}

export async function createCodeInvite(role: UserRole) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "privacy_officer") return { error: "Unauthorized" };

  const code = nanoid(12);

  const { error } = await supabase.from("invites").insert({
    email: null,
    code,
    role,
    status: "pending",
    invited_by: user.id,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  if (error) return { error: error.message };

  return { code };
}

export async function revokeInvite(inviteId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("invites")
    .update({ status: "revoked" })
    .eq("id", inviteId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateUserRole(userId: string, role: UserRole) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (userId === user.id) {
    return { error: "You cannot change your own role" };
  }

  if (role === "privacy_officer") {
    return { error: "Privacy officer role cannot be assigned from the team page" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "privacy_officer") return { error: "Unauthorized" };

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) return { error: error.message };
  return { success: true };
}
