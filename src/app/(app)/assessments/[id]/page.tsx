import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ClipboardCheck,
  GitBranch,
  Shield,
  AlertTriangle,
  FileCheck,
  FileOutput,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Assessment, AssessmentStatus, ThresholdCheck } from "@/types/database";

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

interface Step {
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  available: boolean;
}

export default async function AssessmentPage({
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

  // Check threshold status
  const { data: rawThreshold } = await supabase
    .from("threshold_checks")
    .select("*")
    .eq("assessment_id", id)
    .maybeSingle();

  const threshold = rawThreshold as ThresholdCheck | null;
  const thresholdComplete = threshold !== null && threshold.result !== "pending";
  const fullPiaRequired = threshold?.result === "full_pia_required";

  const steps: Step[] = [
    {
      label: "Threshold Assessment",
      description:
        "Quick screening to determine if a full PIA is needed for this project.",
      href: `/assessments/${id}/threshold`,
      icon: <ClipboardCheck className="h-6 w-6" />,
      available: true,
    },
    {
      label: "Data Flow Mapping",
      description:
        "Map how personal information flows through your project — collection, use, storage, disclosure.",
      href: `/assessments/${id}/data-flow`,
      icon: <GitBranch className="h-6 w-6" />,
      available: thresholdComplete && fullPiaRequired,
    },
    {
      label: "APP Analysis",
      description:
        "Assess compliance against each of the 13 Australian Privacy Principles.",
      href: `/assessments/${id}/app-analysis`,
      icon: <Shield className="h-6 w-6" />,
      available: thresholdComplete && fullPiaRequired,
    },
    {
      label: "Risk Register",
      description:
        "Identify, score, and plan mitigations for privacy risks.",
      href: `/assessments/${id}/risks`,
      icon: <AlertTriangle className="h-6 w-6" />,
      available: thresholdComplete && fullPiaRequired,
    },
    {
      label: "Review & Approval",
      description:
        "Submit for review, add comments, and track approval status.",
      href: `/assessments/${id}/review`,
      icon: <FileCheck className="h-6 w-6" />,
      available: thresholdComplete && fullPiaRequired,
    },
    {
      label: "Report",
      description:
        "View the complete PIA report and download as Word document.",
      href: `/assessments/${id}/report`,
      icon: <FileOutput className="h-6 w-6" />,
      available: thresholdComplete && fullPiaRequired,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">{assessment.title}</h1>
          <Badge variant={statusVariants[assessment.status]}>
            {statusLabels[assessment.status]}
          </Badge>
        </div>
        {assessment.description && (
          <p className="mt-2 text-muted-foreground">
            {assessment.description}
          </p>
        )}
        {assessment.project_name && (
          <p className="mt-1 text-sm text-muted-foreground">
            Project: {assessment.project_name}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step, i) => (
          <Card
            key={step.label}
            className={
              step.available
                ? "transition-colors hover:border-primary/50"
                : "opacity-50"
            }
          >
            {step.available ? (
              <Link href={step.href} className="block">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {step.icon}
                    </div>
                    <CardTitle className="text-base">
                      {i + 1}. {step.label}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{step.description}</CardDescription>
                </CardContent>
              </Link>
            ) : (
              <>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      {step.icon}
                    </div>
                    <CardTitle className="text-base">
                      {i + 1}. {step.label}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Complete the threshold assessment first.
                  </CardDescription>
                </CardContent>
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
