import type { AssessmentStatus } from "@/types/database";

// Status transition rules (see docs/steps/step-05-review.md §4).
//
//   From \ To  | draft | in_review | approved | archived
//   -----------+-------+-----------+----------+---------
//   draft      |   -   |  anyone   |    -     |  anyone
//   in_review  |  PO   |     -     |    PO    |  anyone
//   approved   |  PO   |     -     |    -     |  anyone
//   archived   |  PO*  |     -     |    -     |    -
//
//   * PO unarchive sends the assessment back to draft.

type TransitionRule = "anyone" | "privacy_officer" | "forbidden";

const MATRIX: Record<AssessmentStatus, Record<AssessmentStatus, TransitionRule>> = {
  draft: {
    draft: "forbidden",
    in_review: "anyone",
    approved: "forbidden",
    archived: "anyone",
  },
  in_review: {
    draft: "privacy_officer",
    in_review: "forbidden",
    approved: "privacy_officer",
    archived: "anyone",
  },
  approved: {
    draft: "privacy_officer",
    in_review: "forbidden",
    approved: "forbidden",
    archived: "anyone",
  },
  archived: {
    draft: "privacy_officer",
    in_review: "forbidden",
    approved: "forbidden",
    archived: "forbidden",
  },
};

export function transitionRule(
  from: AssessmentStatus,
  to: AssessmentStatus
): TransitionRule {
  return MATRIX[from][to];
}

export function canTransition(
  from: AssessmentStatus,
  to: AssessmentStatus,
  isPrivacyOfficer: boolean
): boolean {
  const rule = transitionRule(from, to);
  if (rule === "forbidden") return false;
  if (rule === "anyone") return true;
  return isPrivacyOfficer;
}

export interface TransitionOption {
  to: AssessmentStatus;
  label: string;
  requiresPrivacyOfficer: boolean;
}

// UI-friendly list of transitions available from a given state.
export function availableTransitions(from: AssessmentStatus): TransitionOption[] {
  const options: TransitionOption[] = [];
  const labels: Record<AssessmentStatus, Partial<Record<AssessmentStatus, string>>> = {
    draft: { in_review: "Submit for review", archived: "Archive" },
    in_review: { approved: "Approve", draft: "Revert to draft", archived: "Archive" },
    approved: { draft: "Revert to draft", archived: "Archive" },
    archived: { draft: "Unarchive" },
  };

  const fromLabels = labels[from] ?? {};
  for (const [to, label] of Object.entries(fromLabels) as [AssessmentStatus, string][]) {
    const rule = transitionRule(from, to);
    if (rule === "forbidden") continue;
    options.push({
      to,
      label,
      requiresPrivacyOfficer: rule === "privacy_officer",
    });
  }
  return options;
}
