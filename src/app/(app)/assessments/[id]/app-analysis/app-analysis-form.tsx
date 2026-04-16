"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Save,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MinusCircle,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { APP_DEFINITIONS } from "@/lib/app-definitions";
import type { AppAnalysis, ComplianceStatus } from "@/types/database";
import { saveAppAnalysis } from "./actions";

interface AppAnalysisFormProps {
  assessmentId: string;
  assessmentTitle: string;
  existingAnalyses: AppAnalysis[];
}

interface AnalysisDraft {
  compliance_status: ComplianceStatus;
  findings: string;
  recommendations: string;
}

const COMPLIANCE_OPTIONS: {
  value: ComplianceStatus;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: "not_assessed",
    label: "Not Assessed",
    icon: <Circle className="h-4 w-4" />,
    color: "text-muted-foreground",
  },
  {
    value: "compliant",
    label: "Compliant",
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-green-600",
  },
  {
    value: "partially_compliant",
    label: "Partially Compliant",
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-amber-600",
  },
  {
    value: "non_compliant",
    label: "Non-Compliant",
    icon: <XCircle className="h-4 w-4" />,
    color: "text-red-600",
  },
  {
    value: "not_applicable",
    label: "Not Applicable",
    icon: <MinusCircle className="h-4 w-4" />,
    color: "text-muted-foreground",
  },
];

function statusIcon(status: ComplianceStatus) {
  const opt = COMPLIANCE_OPTIONS.find((o) => o.value === status);
  return opt ? (
    <span className={opt.color}>{opt.icon}</span>
  ) : null;
}

function statusLabel(status: ComplianceStatus) {
  const opt = COMPLIANCE_OPTIONS.find((o) => o.value === status);
  return opt?.label ?? status;
}

export function AppAnalysisForm({
  assessmentId,
  assessmentTitle,
  existingAnalyses,
}: AppAnalysisFormProps) {
  const router = useRouter();

  // Build initial state from existing analyses or empty
  const initialDrafts: Record<number, AnalysisDraft> = {};
  for (const app of APP_DEFINITIONS) {
    const existing = existingAnalyses.find((a) => a.app_number === app.number);
    initialDrafts[app.number] = existing
      ? {
          compliance_status: existing.compliance_status,
          findings: existing.findings ?? "",
          recommendations: existing.recommendations ?? "",
        }
      : {
          compliance_status: "not_assessed",
          findings: "",
          recommendations: "",
        };
  }

  const [drafts, setDrafts] =
    useState<Record<number, AnalysisDraft>>(initialDrafts);
  const [expandedApp, setExpandedApp] = useState<number | null>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function updateDraft(appNumber: number, updates: Partial<AnalysisDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [appNumber]: { ...prev[appNumber], ...updates },
    }));
    setSaved(false);
  }

  const assessedCount = APP_DEFINITIONS.filter(
    (app) => drafts[app.number].compliance_status !== "not_assessed"
  ).length;

  async function handleSaveAll() {
    setSaving(true);
    setError(null);

    for (const app of APP_DEFINITIONS) {
      const draft = drafts[app.number];
      // Only save if something has been entered
      if (
        draft.compliance_status === "not_assessed" &&
        !draft.findings &&
        !draft.recommendations
      ) {
        continue;
      }

      const result = await saveAppAnalysis(assessmentId, app.number, {
        compliance_status: draft.compliance_status,
        findings: draft.findings,
        recommendations: draft.recommendations,
      });

      if (result.error) {
        setError(result.error);
        setSaving(false);
        return;
      }
    }

    setSaved(true);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl pb-24">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/assessments/${assessmentId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {assessmentTitle}
        </Link>
        <h1 className="mt-3 text-2xl font-bold">
          Australian Privacy Principles Analysis
        </h1>
        <p className="mt-1 text-muted-foreground">
          Assess your project&apos;s compliance against each of the 13
          Australian Privacy Principles. Expand each APP to review key questions,
          record findings, and set a compliance status.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {saved && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
          Analysis saved successfully.
        </div>
      )}

      {/* APP list */}
      <div className="rounded-lg border overflow-hidden">
        {APP_DEFINITIONS.map((app, i) => {
          const draft = drafts[app.number];
          const isExpanded = expandedApp === app.number;

          return (
            <div
              key={app.number}
              className={i !== 0 ? "border-t" : ""}
            >
              {/* APP header row */}
              <button
                type="button"
                onClick={() =>
                  setExpandedApp(isExpanded ? null : app.number)
                }
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 ${
                  i % 2 === 0 ? "bg-background" : "bg-muted/20"
                }`}
              >
                <div className="flex items-center gap-2 shrink-0">
                  {statusIcon(draft.compliance_status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{app.title}</p>
                </div>
                <span
                  className={`text-xs shrink-0 ${
                    draft.compliance_status === "not_assessed"
                      ? "text-muted-foreground"
                      : draft.compliance_status === "compliant"
                        ? "text-green-600"
                        : draft.compliance_status === "non_compliant"
                          ? "text-red-600"
                          : draft.compliance_status === "partially_compliant"
                            ? "text-amber-600"
                            : "text-muted-foreground"
                  }`}
                >
                  {statusLabel(draft.compliance_status)}
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t bg-background px-4 py-4 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {app.description}
                  </p>

                  {/* Key questions */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Key questions to consider
                    </p>
                    <ul className="space-y-1.5">
                      {app.keyQuestions.map((q, qi) => (
                        <li
                          key={qi}
                          className="flex items-start gap-2 text-sm"
                        >
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Compliance status */}
                  <div className="space-y-2">
                    <Label>Compliance status</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {COMPLIANCE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            updateDraft(app.number, {
                              compliance_status: opt.value,
                            })
                          }
                          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                            draft.compliance_status === opt.value
                              ? opt.value === "compliant"
                                ? "bg-green-500 text-white"
                                : opt.value === "partially_compliant"
                                  ? "bg-amber-500 text-white"
                                  : opt.value === "non_compliant"
                                    ? "bg-red-500 text-white"
                                    : "bg-muted text-foreground ring-1 ring-border"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {opt.icon}
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Findings */}
                  <div className="space-y-2">
                    <Label>Findings</Label>
                    <Textarea
                      value={draft.findings}
                      onChange={(e) =>
                        updateDraft(app.number, { findings: e.target.value })
                      }
                      placeholder="Describe how this principle applies to your project and any issues identified..."
                      rows={3}
                    />
                  </div>

                  {/* Recommendations */}
                  <div className="space-y-2">
                    <Label>Recommendations</Label>
                    <Textarea
                      value={draft.recommendations}
                      onChange={(e) =>
                        updateDraft(app.number, {
                          recommendations: e.target.value,
                        })
                      }
                      placeholder="Suggest actions to achieve or maintain compliance..."
                      rows={3}
                    />
                  </div>

                  {/* Navigation */}
                  <div className="flex justify-between pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={app.number === 1}
                      onClick={() => setExpandedApp(app.number - 1)}
                    >
                      Previous APP
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={app.number === 13}
                      onClick={() => setExpandedApp(app.number + 1)}
                    >
                      Next APP
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">
            {assessedCount} of 13 APPs assessed
          </span>
          <Button onClick={handleSaveAll} disabled={saving} size="sm">
            <Save className="mr-1 h-4 w-4" />
            {saving ? "Saving..." : "Save all"}
          </Button>
        </div>
      </div>
    </div>
  );
}
