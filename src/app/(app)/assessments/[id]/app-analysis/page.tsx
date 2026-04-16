import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import type { Assessment, AppAnalysis } from "@/types/database";
import { AppAnalysisForm } from "./app-analysis-form";

export default async function AppAnalysisPage({
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

  const { data: rawAnalyses } = await supabase
    .from("app_analyses")
    .select("*")
    .eq("assessment_id", id)
    .order("app_number", { ascending: true });

  const analyses = (rawAnalyses as AppAnalysis[]) ?? [];

  return (
    <AppAnalysisForm
      assessmentId={id}
      assessmentTitle={assessment.title}
      existingAnalyses={analyses}
    />
  );
}
