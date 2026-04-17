import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import type {
  Assessment,
  AppAnalysis,
  DataFlow,
  Risk,
} from "@/types/database";
import { RisksForm } from "./risks-form";

export default async function RisksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rawAssessment } = await supabase
    .from("assessments")
    .select("*")
    .eq("id", id)
    .single();

  const assessment = rawAssessment as Assessment | null;
  if (!assessment) notFound();

  const [{ data: rawRisks }, { data: rawFlows }, { data: rawAnalyses }] =
    await Promise.all([
      supabase
        .from("risks")
        .select("*")
        .eq("assessment_id", id)
        .order("risk_score", { ascending: false }),
      supabase
        .from("data_flows")
        .select("*")
        .eq("assessment_id", id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("app_analyses")
        .select("*")
        .eq("assessment_id", id)
        .order("app_number", { ascending: true }),
    ]);

  return (
    <RisksForm
      assessmentId={id}
      assessmentTitle={assessment.title}
      initialRisks={(rawRisks as Risk[]) ?? []}
      dataFlows={(rawFlows as DataFlow[]) ?? []}
      appAnalyses={(rawAnalyses as AppAnalysis[]) ?? []}
    />
  );
}
