"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AssessmentStatus } from "@/types/database";
import { availableTransitions } from "@/lib/review-transitions";
import { updateAssessmentStatus } from "./actions";

const STATUS_LABELS: Record<AssessmentStatus, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  archived: "Archived",
};

const STATUS_VARIANTS: Record<
  AssessmentStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "outline",
  in_review: "secondary",
  approved: "default",
  archived: "destructive",
};

interface Props {
  assessmentId: string;
  status: AssessmentStatus;
  isPrivacyOfficer: boolean;
  onTransition: (from: AssessmentStatus, to: AssessmentStatus) => void;
}

export function StatusControls({
  assessmentId,
  status,
  isPrivacyOfficer,
  onTransition,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const options = availableTransitions(status);
  const archived = status === "archived";

  function handleClick(to: AssessmentStatus) {
    startTransition(async () => {
      const result = await updateAssessmentStatus(assessmentId, to);
      if ("error" in result && result.error) {
        window.alert(result.error);
        return;
      }
      onTransition(status, to);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-muted-foreground">Status:</span>
      <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>

      <div className="flex flex-wrap items-center gap-2">
        {options.map((opt) => {
          const disabledByRole =
            opt.requiresPrivacyOfficer && !isPrivacyOfficer;
          const hiddenWhenArchived =
            archived && !(isPrivacyOfficer && opt.to === "draft");

          if (hiddenWhenArchived) return null;

          const title = disabledByRole
            ? "Only a privacy officer can perform this action"
            : archived
              ? "Assessment is archived"
              : undefined;

          return (
            <Button
              key={opt.to}
              size="sm"
              variant={opt.to === "approved" ? "default" : "outline"}
              onClick={() => handleClick(opt.to)}
              disabled={isPending || disabledByRole}
              title={title}
            >
              {opt.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
