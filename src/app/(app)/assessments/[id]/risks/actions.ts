"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type {
  Risk,
  RiskLikelihood,
  RiskConsequence,
  RiskStatus,
} from "@/types/database";

export interface RiskFormData {
  description: string;
  category: string | null;
  likelihood: RiskLikelihood;
  consequence: RiskConsequence;
  mitigation: string | null;
  residual_likelihood: RiskLikelihood | null;
  residual_consequence: RiskConsequence | null;
  status: RiskStatus;
  ai_suggested?: boolean;
}

export async function createRisk(
  assessmentId: string,
  formData: RiskFormData
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("risks")
    .insert({
      assessment_id: assessmentId,
      ...formData,
    })
    .select("*")
    .single();

  if (error) return { error: error.message };
  return { risk: data as Risk };
}

export async function updateRisk(
  riskId: string,
  formData: Partial<RiskFormData>
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("risks")
    .update({
      ...formData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", riskId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function createManyRisks(
  assessmentId: string,
  items: RiskFormData[]
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (items.length === 0) return { risks: [] };

  const { data, error } = await supabase
    .from("risks")
    .insert(
      items.map((item) => ({
        assessment_id: assessmentId,
        ...item,
      }))
    )
    .select("*");

  if (error) return { error: error.message };
  return { risks: (data as Risk[]) ?? [] };
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

  return { risks: (data as Risk[]) ?? [] };
}
