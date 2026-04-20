"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Info,
  ArrowRight,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  THRESHOLD_QUESTIONS,
  calculateThresholdResult,
  type ThresholdResponses,
} from "@/lib/threshold-questions";
import type { ThresholdCheck, ThresholdResult } from "@/types/database";
import { saveThreshold } from "./actions";

interface ThresholdFormProps {
  assessmentId: string;
  assessmentTitle: string;
  existingThreshold: ThresholdCheck | null;
  readOnly?: boolean;
  isArchived?: boolean;
}

const resultConfig: Record<
  Exclude<ThresholdResult, "pending">,
  {
    label: string;
    description: string;
    color: string;
    borderColor: string;
    icon: React.ReactNode;
  }
> = {
  full_pia_required: {
    label: "Full PIA Required",
    description:
      "This project presents high privacy risks. A full Privacy Impact Assessment is required before proceeding.",
    color: "bg-red-50 text-red-800",
    borderColor: "border-red-300",
    icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
  },
  pia_recommended: {
    label: "PIA Recommended",
    description:
      "This project may present privacy risks. A Privacy Impact Assessment is recommended.",
    color: "bg-amber-50 text-amber-800",
    borderColor: "border-amber-300",
    icon: <Info className="h-5 w-5 text-amber-600" />,
  },
  not_required: {
    label: "PIA Not Required",
    description:
      "A full PIA does not appear necessary. You may still choose to conduct one.",
    color: "bg-green-50 text-green-800",
    borderColor: "border-green-300",
    icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
  },
};

export function ThresholdForm({
  assessmentId,
  assessmentTitle,
  existingThreshold,
  readOnly = false,
  isArchived = false,
}: ThresholdFormProps) {
  const router = useRouter();
  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [responses, setResponses] = useState<ThresholdResponses>(
    (existingThreshold?.responses as ThresholdResponses) ?? {}
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedResult, setSubmittedResult] =
    useState<ThresholdResult | null>(
      existingThreshold?.result && existingThreshold.result !== "pending"
        ? existingThreshold.result
        : null
    );
  const [expandedHelp, setExpandedHelp] = useState<string | null>(null);

  const answeredCount = THRESHOLD_QUESTIONS.filter(
    (q) => responses[q.id] === true || responses[q.id] === false
  ).length;
  const allAnswered = answeredCount === THRESHOLD_QUESTIONS.length;

  const previewResult = allAnswered
    ? calculateThresholdResult(responses)
    : null;

  const scrollToNextUnanswered = useCallback(
    (currentIndex: number) => {
      for (let i = currentIndex + 1; i < THRESHOLD_QUESTIONS.length; i++) {
        const q = THRESHOLD_QUESTIONS[i];
        if (responses[q.id] !== true && responses[q.id] !== false) {
          questionRefs.current[i]?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          return;
        }
      }
    },
    [responses]
  );

  function handleAnswer(questionId: string, answer: boolean, index: number) {
    if (readOnly) return;
    setResponses((prev) => ({ ...prev, [questionId]: answer }));
    if (submittedResult) {
      setSubmittedResult(null);
    }
    // Auto-scroll to next unanswered after a brief delay
    setTimeout(() => scrollToNextUnanswered(index), 150);
  }

  async function handleSubmit() {
    if (readOnly) return;
    setSaving(true);
    setError(null);

    const result = await saveThreshold(assessmentId, responses);

    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }

    setSubmittedResult(result.result!);
    setSaving(false);
  }

  function handleProceedToPIA() {
    router.push(`/assessments/${assessmentId}`);
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
        <h1 className="mt-3 text-2xl font-bold">Threshold Assessment</h1>
        <p className="mt-1 text-muted-foreground">
          Answer the following screening questions to determine whether a full
          Privacy Impact Assessment is needed for this project.
        </p>
      </div>

      {readOnly && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
          <Lock className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">Read-only view</p>
            <p className="mt-1">
              {isArchived
                ? "This assessment is archived and can no longer be edited."
                : "The threshold assessment can only be edited by a privacy officer or project manager."}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Questions — flat list with alternating backgrounds */}
      <div className="rounded-lg border overflow-hidden">
        {THRESHOLD_QUESTIONS.map((q, i) => (
          <div
            key={q.id}
            ref={(el) => {
              questionRefs.current[i] = el;
            }}
            className={`flex items-start justify-between gap-4 px-4 py-3.5 ${
              i % 2 === 0 ? "bg-background" : "bg-muted/30"
            } ${i !== 0 ? "border-t" : ""} ${
              responses[q.id] === true || responses[q.id] === false
                ? "border-l-2 border-l-amber-400"
                : "border-l-2 border-l-transparent"
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-1.5">
                <p className="text-sm font-medium leading-snug">
                  {q.text}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setExpandedHelp(expandedHelp === q.id ? null : q.id)
                  }
                  className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                  title="Show guidance"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </div>
              {expandedHelp === q.id && (
                <div className="mt-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">
                  <p>{q.helpText}</p>
                  <p className="mt-1 font-medium">Source: {q.source}</p>
                </div>
              )}
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={() => handleAnswer(q.id, true, i)}
                disabled={readOnly}
                className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  responses[q.id] === true
                    ? "bg-amber-500 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => handleAnswer(q.id, false, i)}
                disabled={readOnly}
                className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  responses[q.id] === false
                    ? "bg-amber-500 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                No
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Result banner */}
      {submittedResult && submittedResult !== "pending" && (
        <div
          className={`mt-6 flex items-center justify-between rounded-lg border p-4 ${resultConfig[submittedResult].color} ${resultConfig[submittedResult].borderColor}`}
        >
          <div className="flex items-center gap-3">
            {resultConfig[submittedResult].icon}
            <div>
              <p className="font-semibold">
                {resultConfig[submittedResult].label}
              </p>
              <p className="text-sm opacity-80">
                {resultConfig[submittedResult].description}
              </p>
            </div>
          </div>
          <Button
            onClick={handleProceedToPIA}
            size="sm"
            variant="outline"
            className="shrink-0 ml-4 border-current"
          >
            Continue
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Sticky submit bar */}
      {!readOnly && !submittedResult && answeredCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">
              {answeredCount} of {THRESHOLD_QUESTIONS.length} answered
            </span>
            <div className="flex items-center gap-3">
              {allAnswered && previewResult && (
                <span
                  className={`text-sm font-medium ${
                    previewResult === "full_pia_required"
                      ? "text-red-600"
                      : previewResult === "pia_recommended"
                        ? "text-amber-600"
                        : "text-green-600"
                  }`}
                >
                  {resultConfig[previewResult].label}
                </span>
              )}
              <Button
                onClick={handleSubmit}
                disabled={!allAnswered || saving}
                size="sm"
              >
                {saving ? "Saving..." : "Submit"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
