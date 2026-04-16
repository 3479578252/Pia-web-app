"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { AppAnalysis, ComplianceStatus } from "@/types/database";

export interface AppAnalysisFormData {
  compliance_status: ComplianceStatus;
  findings: string;
  recommendations: string;
}

export async function saveAppAnalysis(
  assessmentId: string,
  appNumber: number,
  formData: AppAnalysisFormData
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check if analysis already exists for this APP
  const { data: existing } = await supabase
    .from("app_analyses")
    .select("id")
    .eq("assessment_id", assessmentId)
    .eq("app_number", appNumber)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("app_analyses")
      .update({
        ...formData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", (existing as { id: string }).id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("app_analyses").insert({
      assessment_id: assessmentId,
      app_number: appNumber,
      ...formData,
    });

    if (error) return { error: error.message };
  }

  return { success: true };
}

export async function getAppAnalyses(assessmentId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("app_analyses")
    .select("*")
    .eq("assessment_id", assessmentId)
    .order("app_number", { ascending: true });

  if (error) return { error: error.message, analyses: [] };

  return { analyses: data as AppAnalysis[] };
}
