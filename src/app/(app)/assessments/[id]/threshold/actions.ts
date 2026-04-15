"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  calculateThresholdResult,
  type ThresholdResponses,
} from "@/lib/threshold-questions";
import type { ThresholdCheck } from "@/types/database";

export async function saveThreshold(
  assessmentId: string,
  responses: ThresholdResponses
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
