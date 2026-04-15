"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
}

const resultConfig: Record<
  Exclude<ThresholdResult, "pending">,
  {
    label: string;
    description: string;
    variant: "default" | "secondary" | "outline" | "destructive";
    icon: React.ReactNode;
  }
> = {
  full_pia_required: {
    label: "Full PIA Required",
    description:
      "Based on your responses, this project presents high privacy risks. A full Privacy Impact Assessment is required before proceeding.",
    variant: "destructive",
    icon: <AlertTriangle className="h-5 w-5" />,
  },
  pia_recommended: {
    label: "PIA Recommended",
    description:
      "Based on your responses, this project may present privacy risks. A Privacy Impact Assessment is recommended to identify and mitigate potential issues.",
    variant: "secondary",
    icon: <Info className="h-5 w-5" />,
  },
  not_required: {
    label: "PIA Not Required",
    description:
      "Based on your responses, a full PIA does not appear to be necessary for this project. However, you may still choose to conduct one.",
    variant: "outline",
    icon: <CheckCircle2 className="h-5 w-5" />,
  },
};

export function ThresholdForm({
  assessmentId,
  assessmentTitle,
  existingThreshold,
}: ThresholdFormProps) {
  const router = useRouter();
  const [responses, setResponses] = useState<ThresholdResponses>(
    (existingThreshold?.responses as ThresholdResponses) ?? {}
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedResult, setSubmittedResult] = useState<ThresholdResult | null>(
    existingThreshold?.result && existingThreshold.result !== "pending"
      ? existingThreshold.result
      : null
  );
  const [expandedHelp, setExpandedHelp] = useState<string | null>(null);

  const allAnswered = THRESHOLD_QUESTIONS.every(
    (q) => responses[q.id] === true || responses[q.id] === false
  );

  const previewResult = allAnswered
    ? calculateThresholdResult(responses)
    : null;

  function handleAnswer(questionId: string, answer: boolean) {
    setResponses((prev) => ({ ...prev, [questionId]: answer }));
    // Clear submitted result when answers change so user can re-submit
    if (submittedResult) {
      setSubmittedResult(null);
    }
  }

  async function handleSubmit() {
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

  const highRiskQuestions = THRESHOLD_QUESTIONS.filter(
    (q) => q.category === "high_risk"
  );
  const standardQuestions = THRESHOLD_QUESTIONS.filter(
    (q) => q.category === "standard"
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
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

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* High-risk questions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">High-Risk Indicators</CardTitle>
          <CardDescription>
            A &quot;yes&quot; to any of these questions means a full PIA is
            required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {highRiskQuestions.map((q, i) => (
            <QuestionRow
              key={q.id}
              number={i + 1}
              question={q}
              answer={responses[q.id]}
              onAnswer={(answer) => handleAnswer(q.id, answer)}
              expanded={expandedHelp === q.id}
              onToggleHelp={() =>
                setExpandedHelp(expandedHelp === q.id ? null : q.id)
              }
            />
          ))}
        </CardContent>
      </Card>

      {/* Standard questions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Additional Considerations</CardTitle>
          <CardDescription>
            Two or more &quot;yes&quot; answers here indicate a PIA is
            recommended.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {standardQuestions.map((q, i) => (
            <QuestionRow
              key={q.id}
              number={highRiskQuestions.length + i + 1}
              question={q}
              answer={responses[q.id]}
              onAnswer={(answer) => handleAnswer(q.id, answer)}
              expanded={expandedHelp === q.id}
              onToggleHelp={() =>
                setExpandedHelp(expandedHelp === q.id ? null : q.id)
              }
            />
          ))}
        </CardContent>
      </Card>

      {/* Submit / Result */}
      {!submittedResult && (
        <div className="flex items-center gap-3">
          <Button onClick={handleSubmit} disabled={!allAnswered || saving}>
            {saving ? "Saving..." : "Submit assessment"}
          </Button>
          {!allAnswered && (
            <span className="text-sm text-muted-foreground">
              Answer all questions to submit
            </span>
          )}
          {allAnswered && previewResult && !saving && (
            <Badge variant={resultConfig[previewResult].variant}>
              {resultConfig[previewResult].label}
            </Badge>
          )}
        </div>
      )}

      {submittedResult && submittedResult !== "pending" && (
        <Card
          className={
            submittedResult === "full_pia_required"
              ? "border-destructive/50"
              : submittedResult === "pia_recommended"
                ? "border-primary/50"
                : "border-green-500/50"
          }
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              {resultConfig[submittedResult].icon}
              <div>
                <CardTitle>
                  <Badge variant={resultConfig[submittedResult].variant}>
                    {resultConfig[submittedResult].label}
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-2">
                  {resultConfig[submittedResult].description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              {(submittedResult === "full_pia_required" ||
                submittedResult === "pia_recommended") && (
                <Button onClick={handleProceedToPIA}>
                  Continue to full PIA
                </Button>
              )}
              {submittedResult === "not_required" && (
                <>
                  <Button onClick={handleProceedToPIA}>
                    Return to assessment
                  </Button>
                  <Button variant="outline" onClick={handleProceedToPIA}>
                    Proceed with PIA anyway
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface QuestionRowProps {
  number: number;
  question: {
    id: string;
    text: string;
    helpText: string;
    category: "high_risk" | "standard";
    source: string;
  };
  answer: boolean | undefined;
  onAnswer: (answer: boolean) => void;
  expanded: boolean;
  onToggleHelp: () => void;
}

function QuestionRow({
  number,
  question,
  answer,
  onAnswer,
  expanded,
  onToggleHelp,
}: QuestionRowProps) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium">
            <span className="text-muted-foreground">{number}.</span>{" "}
            {question.text}
          </p>
          <button
            type="button"
            onClick={onToggleHelp}
            className="mt-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {expanded ? "Hide guidance" : "Show guidance"}
          </button>
          {expanded && (
            <div className="mt-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">
              <p>{question.helpText}</p>
              <p className="mt-1 font-medium">Source: {question.source}</p>
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => onAnswer(true)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              answer === true
                ? "bg-destructive text-destructive-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => onAnswer(false)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              answer === false
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            No
          </button>
        </div>
      </div>
    </div>
  );
}
