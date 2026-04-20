import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import type { Assessment, Profile, ThresholdCheck } from "@/types/database";
import { canEditThreshold } from "@/lib/threshold-permissions";
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

  const [{ data: rawAssessment }, { data: rawProfile }, { data: rawThreshold }] =
    await Promise.all([
      supabase.from("assessments").select("*").eq("id", id).single(),
      supabase.from("profiles").select("role").eq("id", user.id).single(),
      supabase
        .from("threshold_checks")
        .select("*")
        .eq("assessment_id", id)
        .maybeSingle(),
    ]);

  const assessment = rawAssessment as Assessment | null;
  if (!assessment) notFound();

  const role = (rawProfile as Pick<Profile, "role"> | null)?.role ?? null;
  const isArchived = assessment.status === "archived";
  const readOnly = !canEditThreshold(role) || isArchived;
  const threshold = rawThreshold as ThresholdCheck | null;

  return (
    <ThresholdForm
      assessmentId={id}
      assessmentTitle={assessment.title}
      existingThreshold={threshold}
      readOnly={readOnly}
      isArchived={isArchived}
    />
  );
}
