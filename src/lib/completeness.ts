import type {
  AppAnalysis,
  CommentSection,
  DataFlow,
  Risk,
  ThresholdCheck,
} from "@/types/database";
import { SECTION_LABELS } from "./section-labels";

export interface CompletenessInput {
  threshold: ThresholdCheck | null;
  dataFlows: DataFlow[];
  appAnalyses: AppAnalysis[];
  risks: Risk[];
}

export interface CompletenessMissing {
  section: CommentSection;
  label: string;
  reason: string;
}

export interface CompletenessResult {
  complete: boolean;
  missing: CompletenessMissing[];
}

export interface CompletenessSummary {
  thresholdResult: string | null;
  dataFlowCount: number;
  appNumbers: number[];
  risksCount: number;
}

// Same rules as isAssessmentComplete, but operates on pre-aggregated counts
// suitable for the review page's batched bundle fetch.
export function isSummaryComplete(summary: CompletenessSummary): CompletenessResult {
  const missing: CompletenessMissing[] = [];

  if (!summary.thresholdResult || summary.thresholdResult === "pending") {
    missing.push({
      section: "threshold",
      label: SECTION_LABELS.threshold,
      reason: "No threshold result recorded.",
    });
  }

  if (summary.dataFlowCount === 0) {
    missing.push({
      section: "data_flow",
      label: SECTION_LABELS.data_flow,
      reason: "No data flows recorded.",
    });
  }

  const appNumbers = new Set(summary.appNumbers);
  const expected = Array.from({ length: 13 }, (_, i) => i + 1);
  const missingApps = expected.filter((n) => !appNumbers.has(n));
  if (missingApps.length > 0) {
    missing.push({
      section: "app_analysis",
      label: SECTION_LABELS.app_analysis,
      reason: `Missing APP${missingApps.length > 1 ? "s" : ""} ${missingApps.join(", ")}.`,
    });
  }

  if (summary.risksCount === 0) {
    missing.push({
      section: "risks",
      label: SECTION_LABELS.risks,
      reason: "No risks recorded.",
    });
  }

  return { complete: missing.length === 0, missing };
}

// Loose rules — flagged for revisit after live-env testing (see docs/backlog.md).
// Each section passes if the minimum signal of intent is present.
export function isAssessmentComplete(input: CompletenessInput): CompletenessResult {
  const missing: CompletenessMissing[] = [];

  if (!input.threshold || input.threshold.result === "pending") {
    missing.push({
      section: "threshold",
      label: SECTION_LABELS.threshold,
      reason: "No threshold result recorded.",
    });
  }

  if (input.dataFlows.length === 0) {
    missing.push({
      section: "data_flow",
      label: SECTION_LABELS.data_flow,
      reason: "No data flows recorded.",
    });
  }

  const appNumbers = new Set(input.appAnalyses.map((a) => a.app_number));
  const expected = Array.from({ length: 13 }, (_, i) => i + 1);
  const missingApps = expected.filter((n) => !appNumbers.has(n));
  if (missingApps.length > 0) {
    missing.push({
      section: "app_analysis",
      label: SECTION_LABELS.app_analysis,
      reason: `Missing APP${missingApps.length > 1 ? "s" : ""} ${missingApps.join(", ")}.`,
    });
  }

  if (input.risks.length === 0) {
    missing.push({
      section: "risks",
      label: SECTION_LABELS.risks,
      reason: "No risks recorded.",
    });
  }

  return { complete: missing.length === 0, missing };
}
