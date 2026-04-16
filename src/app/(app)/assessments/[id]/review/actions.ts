"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { AssessmentStatus, Comment } from "@/types/database";

export async function updateAssessmentStatus(
  assessmentId: string,
  status: AssessmentStatus
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("assessments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", assessmentId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function addComment(
  assessmentId: string,
  body: string,
  section?: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("comments").insert({
    assessment_id: assessmentId,
    user_id: user.id,
    body,
    section: section || null,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function getComments(assessmentId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("assessment_id", assessmentId)
    .order("created_at", { ascending: true });

  if (error) return { error: error.message, comments: [] };

  return { comments: data as Comment[] };
}

export async function deleteComment(commentId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}
