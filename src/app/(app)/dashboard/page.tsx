import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardContent } from "./dashboard-content";
import type { Profile, AssessmentStatus } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = rawProfile as Profile | null;
  if (!profile) redirect("/login");

  const isPrivacyOfficer = profile.role === "privacy_officer";

  // Privacy officers see all assessments; others see their own
  let assessmentsQuery = supabase
    .from("assessments")
    .select("*, profiles!assessments_created_by_fkey(display_name, email)")
    .order("updated_at", { ascending: false })
    .limit(10);

  if (!isPrivacyOfficer) {
    assessmentsQuery = assessmentsQuery.or(
      `created_by.eq.${user.id},assigned_to.eq.${user.id}`
    );
  }

  const { data: rawAssessments } = await assessmentsQuery;
  const assessments = (rawAssessments || []) as Array<{
    id: string;
    title: string;
    status: AssessmentStatus;
    updated_at: string;
    created_by: string;
    profiles: { display_name: string | null; email: string } | null;
  }>;

  // Counts by status
  let countQuery = supabase.from("assessments").select("status");
  if (!isPrivacyOfficer) {
    countQuery = countQuery.or(
      `created_by.eq.${user.id},assigned_to.eq.${user.id}`
    );
  }
  const { data: allAssessments } = await countQuery;

  const statusCounts = {
    draft: 0,
    in_review: 0,
    approved: 0,
    archived: 0,
  };
  ((allAssessments || []) as Array<{ status: string }>).forEach((a) => {
    if (a.status in statusCounts) {
      statusCounts[a.status as keyof typeof statusCounts]++;
    }
  });

  return (
    <DashboardContent
      profile={profile}
      assessments={assessments}
      statusCounts={statusCounts}
    />
  );
}
