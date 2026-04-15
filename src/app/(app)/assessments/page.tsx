import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Assessment, AssessmentStatus } from "@/types/database";

const statusLabels: Record<AssessmentStatus, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  archived: "Archived",
};

const statusVariants: Record<
  AssessmentStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "outline",
  in_review: "secondary",
  approved: "default",
  archived: "outline",
};

export default async function AssessmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isPrivacyOfficer = profile?.role === "privacy_officer";

  let query = supabase
    .from("assessments")
    .select("*, profiles!assessments_created_by_fkey(display_name, email)")
    .order("updated_at", { ascending: false });

  if (!isPrivacyOfficer) {
    query = query.or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`);
  }

  const { data: rawAssessments } = await query;
  const assessments = rawAssessments as (Assessment & {
    profiles: { display_name: string | null; email: string } | null;
  })[] | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Assessments</h1>
          <p className="text-muted-foreground">
            {isPrivacyOfficer
              ? "All Privacy Impact Assessments across the organisation."
              : "Your Privacy Impact Assessments."}
          </p>
        </div>
        <Button asChild>
          <Link href="/assessments/new">
            <Plus className="mr-2 h-4 w-4" />
            New Assessment
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            All Assessments ({assessments?.length ?? 0})
          </CardTitle>
          <CardDescription>
            Click an assessment to view details and continue working.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!assessments || assessments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No assessments yet. Create your first one to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {assessments.map((a) => (
                <Link
                  key={a.id}
                  href={`/assessments/${a.id}`}
                  className="flex items-center justify-between rounded-md border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.description && `${a.description.slice(0, 80)}... · `}
                      Updated{" "}
                      {new Date(a.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={statusVariants[a.status]}>
                    {statusLabels[a.status]}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
