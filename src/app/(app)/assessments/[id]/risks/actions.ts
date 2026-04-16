"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Risk, RiskLikelihood, RiskConsequence, RiskStatus } from "@/types/database";

export interface RiskFormData {
  description: string;
  category: string;
  likelihood: RiskLikelihood;
  consequence: RiskConsequence;
  mitigation: string;
  residual_likelihood: RiskLikelihood | null;
  residual_consequence: RiskConsequence | null;
  status: RiskStatus;
}

export async function saveRisk(
  assessmentId: string,
  formData: RiskFormData,
  existingId?: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (existingId) {
    const { error } = await supabase
      .from("risks")
      .update({
        ...formData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingId);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("risks").insert({
      assessment_id: assessmentId,
      ...formData,
    });

    if (error) return { error: error.message };
  }

  return { success: true };
}

export async function getRisks(assessmentId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("risks")
    .select("*")
    .eq("assessment_id", assessmentId)
    .order("risk_score", { ascending: false });

  if (error) return { error: error.message, risks: [] };

  return { risks: data as Risk[] };
}

export async function deleteRisk(riskId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("risks")
    .delete()
    .eq("id", riskId);

  if (error) return { error: error.message };
  return { success: true };
}
