"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  calculateThresholdResult,
  type ThresholdResponses,
} from "@/lib/threshold-questions";
import { canEditThreshold } from "@/lib/threshold-permissions";
import type { Profile, ThresholdCheck } from "@/types/database";

export async function saveThreshold(
  assessmentId: string,
  responses: ThresholdResponses
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profileData }, { data: assessmentData }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase.from("assessments").select("status").eq("id", assessmentId).single(),
  ]);

  const role = (profileData as Pick<Profile, "role"> | null)?.role ?? null;
  if (!canEditThreshold(role)) return { error: "Unauthorized" };

  const status = (assessmentData as { status: string } | null)?.status;
  if (status === "archived") return { error: "Assessment is archived" };

  const result = calculateThresholdResult(responses);

  // Check if a threshold check already exists for this assessment
  const { data: existing } = await supabase
    .from("threshold_checks")
    .select("id")
    .eq("assessment_id", assessmentId)
    .maybeSingle();

  if (existing) {
    // Update existing threshold check
    const { error } = await supabase
      .from("threshold_checks")
      .update({
        responses,
        result,
        completed_at: new Date().toISOString(),
      })
      .eq("id", (existing as { id: string }).id);

    if (error) {
      return { error: error.message };
    }
  } else {
    // Insert new threshold check
    const { error } = await supabase.from("threshold_checks").insert({
      assessment_id: assessmentId,
      responses,
      result,
      completed_at: new Date().toISOString(),
    });

    if (error) {
      return { error: error.message };
    }
  }

  return { result };
}

export async function getThreshold(assessmentId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("threshold_checks")
    .select("*")
    .eq("assessment_id", assessmentId)
    .maybeSingle();

  if (error) {
    return { error: error.message, threshold: null };
  }

  return { threshold: data as ThresholdCheck | null };
}
