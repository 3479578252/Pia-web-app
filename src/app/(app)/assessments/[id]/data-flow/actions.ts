"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { DataFlow } from "@/types/database";

export interface DataFlowFormData {
  description: string;
  personal_info_types: string[];
  collection_method: string;
  storage_location: string;
  access_controls: string;
  third_parties: string[];
  retention_period: string;
  disposal_method: string;
}

export async function saveDataFlow(
  assessmentId: string,
  formData: DataFlowFormData,
  existingId?: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (existingId) {
    const { error } = await supabase
      .from("data_flows")
      .update({
        ...formData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingId);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("data_flows").insert({
      assessment_id: assessmentId,
      ...formData,
    });

    if (error) return { error: error.message };
  }

  return { success: true };
}

export async function getDataFlows(assessmentId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("data_flows")
    .select("*")
    .eq("assessment_id", assessmentId)
    .order("sort_order", { ascending: true });

  if (error) return { error: error.message, dataFlows: [] };

  return { dataFlows: data as DataFlow[] };
}

export async function deleteDataFlow(dataFlowId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("data_flows")
    .delete()
    .eq("id", dataFlowId);

  if (error) return { error: error.message };
  return { success: true };
}
