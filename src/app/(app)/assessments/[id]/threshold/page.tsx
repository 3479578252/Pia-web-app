import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import type { Assessment, ThresholdCheck } from "@/types/database";
import { ThresholdForm } from "./threshold-form";

export default async function ThresholdPage({
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

  // Load existing threshold check if any
  const { data: rawThreshold } = await supabase
    .from("threshold_checks")
    .select("*")
    .eq("assessment_id", id)
    .maybeSingle();

  const threshold = rawThreshold as ThresholdCheck | null;

  return (
    <ThresholdForm
      assessmentId={id}
      assessmentTitle={assessment.title}
      existingThreshold={threshold}
    />
  );
}
