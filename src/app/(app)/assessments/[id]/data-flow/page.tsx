import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import type { Assessment, DataFlow } from "@/types/database";
import { DataFlowForm } from "./data-flow-form";

export default async function DataFlowPage({
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

  const { data: rawDataFlows } = await supabase
    .from("data_flows")
    .select("*")
    .eq("assessment_id", id)
    .order("sort_order", { ascending: true });

  const dataFlows = (rawDataFlows as DataFlow[]) ?? [];

  return (
    <DataFlowForm
      assessmentId={id}
      assessmentTitle={assessment.title}
      existingDataFlows={dataFlows}
    />
  );
}
