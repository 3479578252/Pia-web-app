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

  // RLS restricts rows to PO / creator / collaborator; no client-side
  // filter needed (an explicit `created_by` filter would hide PIAs the
  // caller joined via the collaborator table).
  const { data: rawAssessments } = await supabase
    .from("assessments")
    .select("*, profiles!assessments_created_by_fkey(display_name, email)")
    .order("updated_at", { ascending: false })
    .limit(10);
  const assessments = (rawAssessments || []) as Array<{
    id: string;
    title: string;
    status: AssessmentStatus;
    updated_at: string;
    created_by: string;
    profiles: { display_name: string | null; email: string } | null;
  }>;

  const { data: allAssessments } = await supabase
    .from("assessments")
    .select("status");

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
