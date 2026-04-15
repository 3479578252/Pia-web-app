"use client";

import Link from "next/link";
import {
  FileText,
  Clock,
  CheckCircle2,
  Archive,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Profile, AssessmentStatus } from "@/types/database";

interface AssessmentWithCreator {
  id: string;
  title: string;
  status: AssessmentStatus;
  updated_at: string;
  created_by: string;
  profiles: { display_name: string | null; email: string } | null;
}

interface DashboardContentProps {
  profile: Profile;
  assessments: AssessmentWithCreator[];
  statusCounts: Record<AssessmentStatus, number>;
}

const statusConfig: Record<
  AssessmentStatus,
  {
    label: string;
    icon: React.ReactNode;
    variant: "default" | "secondary" | "outline" | "destructive";
  }
> = {
  draft: {
    label: "Drafts",
    icon: <FileText className="h-5 w-5 text-muted-foreground" />,
    variant: "outline",
  },
  in_review: {
    label: "In Review",
    icon: <Clock className="h-5 w-5 text-yellow-600" />,
    variant: "secondary",
  },
  approved: {
    label: "Approved",
    icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
    variant: "default",
  },
  archived: {
    label: "Archived",
    icon: <Archive className="h-5 w-5 text-muted-foreground" />,
    variant: "outline",
  },
};

export function DashboardContent({
  profile,
  assessments,
  statusCounts,
}: DashboardContentProps) {
  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const greeting = profile.display_name
    ? `Welcome back, ${profile.display_name.split(" ")[0]}`
    : "Welcome back";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{greeting}</h1>
          <p className="text-muted-foreground">
            {profile.role === "privacy_officer"
              ? "Here's an overview of all Privacy Impact Assessments across the organisation."
              : "Here's an overview of your Privacy Impact Assessments."}
          </p>
        </div>
        <Button asChild>
          <Link href="/assessments/new">
            <Plus className="mr-2 h-4 w-4" />
            New Assessment
          </Link>
        </Button>
      </div>

      {/* Status cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(statusConfig) as AssessmentStatus[]).map((status) => (
          <Card key={status}>
            <CardContent className="flex items-center gap-4 pt-6">
              {statusConfig[status].icon}
              <div>
                <p className="text-2xl font-bold">{statusCounts[status]}</p>
                <p className="text-sm text-muted-foreground">
                  {statusConfig[status].label}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent assessments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Assessments</CardTitle>
          <CardDescription>
            {total === 0
              ? "No assessments yet. Create your first one to get started."
              : `Showing the ${Math.min(assessments.length, 10)} most recently updated.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assessments.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground/50" />
              <div>
                <p className="font-medium">No assessments yet</p>
                <p className="text-sm text-muted-foreground">
                  Create a new Privacy Impact Assessment to get started.
                </p>
              </div>
              <Button asChild>
                <Link href="/assessments/new">
                  <Plus className="mr-2 h-4 w-4" />
                  New Assessment
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {assessments.map((assessment) => (
                <Link
                  key={assessment.id}
                  href={`/assessments/${assessment.id}`}
                  className="flex items-center justify-between rounded-md border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{assessment.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {profile.role === "privacy_officer" &&
                        assessment.profiles && (
                          <>
                            by{" "}
                            {assessment.profiles.display_name ||
                              assessment.profiles.email}{" "}
                            ·{" "}
                          </>
                        )}
                      Updated{" "}
                      {new Date(assessment.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={statusConfig[assessment.status].variant}>
                    {statusConfig[assessment.status].label}
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
