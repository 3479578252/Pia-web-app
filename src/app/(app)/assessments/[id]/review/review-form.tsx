"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  Assessment,
  AssessmentStatus,
  AuditLogEntry,
  Comment,
  Profile,
} from "@/types/database";
import { isSummaryComplete } from "@/lib/completeness";
import type { ReviewBundle } from "./actions";
import { StatusControls } from "./status-controls";
import { CommentsPanel } from "./comments-panel";
import { AuditLog } from "./audit-log";

type ProfileSummary = Pick<Profile, "id" | "display_name" | "email">;

interface Props {
  bundle: ReviewBundle;
}

export function ReviewForm({ bundle }: Props) {
  const router = useRouter();

  const [assessment, setAssessment] = useState<Assessment>(bundle.assessment);
  const [comments, setComments] = useState<Comment[]>(bundle.comments);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(bundle.auditLog);
  const [profiles, setProfiles] = useState<Record<string, ProfileSummary>>(
    bundle.profiles
  );

  const isPO = bundle.viewer.role === "privacy_officer";
  const archived = assessment.status === "archived";

  const completeness = useMemo(() => {
    const threshold = bundle.completeness.threshold as
      | { result: string }
      | null;
    return isSummaryComplete({
      thresholdResult: threshold?.result ?? null,
      dataFlowCount: bundle.completeness.dataFlowCount,
      appNumbers: bundle.completeness.appNumbers,
      risksCount: bundle.completeness.risksCount,
    });
  }, [bundle.completeness]);

  const showBanner = assessment.status === "draft" && !completeness.complete;

  function handleTransition(from: AssessmentStatus, to: AssessmentStatus) {
    setAssessment((prev) => ({ ...prev, status: to }));
    setAuditLog((prev) => [
      ...prev,
      {
        id: `optimistic-${Date.now()}`,
        assessment_id: assessment.id,
        user_id: bundle.viewer.id,
        action: "status_changed",
        details: { from, to },
        created_at: new Date().toISOString(),
      },
    ]);
    router.refresh();
  }

  function handleCommentAdded(comment: Comment, author: ProfileSummary) {
    setComments((prev) => [...prev, comment]);
    setProfiles((prev) => ({ ...prev, [author.id]: author }));
    setAuditLog((prev) => [
      ...prev,
      {
        id: `optimistic-${comment.id}`,
        assessment_id: assessment.id,
        user_id: bundle.viewer.id,
        action: "comment_added",
        details: { comment_id: comment.id, section: comment.section ?? "general" },
        created_at: new Date().toISOString(),
      },
    ]);
  }

  function handleCommentDeleted(commentId: string) {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setAuditLog((prev) => [
      ...prev,
      {
        id: `optimistic-del-${commentId}`,
        assessment_id: assessment.id,
        user_id: bundle.viewer.id,
        action: "comment_deleted",
        details: { comment_id: commentId },
        created_at: new Date().toISOString(),
      },
    ]);
  }

  return (
    <div className="mx-auto max-w-5xl pb-24">
      <div className="mb-6">
        <Link
          href={`/assessments/${assessment.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {assessment.title}
        </Link>
        <h1 className="mt-3 text-2xl font-bold">Review &amp; Approval</h1>
        <p className="mt-1 text-muted-foreground">
          Collaborate, move the assessment through its lifecycle, and keep a
          verifiable record of decisions.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Current state</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusControls
            assessmentId={assessment.id}
            status={assessment.status}
            isPrivacyOfficer={isPO}
            onTransition={handleTransition}
          />
        </CardContent>
      </Card>

      {showBanner && (
        <div className="mb-6 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Some sections are not yet complete.</p>
            <p className="mt-1">
              You can still submit for review, but the reviewer will see the
              following gaps:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {completeness.missing.map((m) => (
                <li key={m.section}>
                  <span className="font-medium">{m.label}</span>
                  <span className="text-amber-900/80 dark:text-amber-200/80">
                    {" "}— {m.reason}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {archived && (
        <div className="mb-6 rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
          This assessment is archived. Comments and status changes are disabled.
          {isPO && " A privacy officer can unarchive it to resume editing."}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold">
            Comments{" "}
            <Badge variant="outline" className="ml-1 align-middle text-xs">
              {comments.length}
            </Badge>
          </h2>
          <CommentsPanel
            assessmentId={assessment.id}
            viewerId={bundle.viewer.id}
            profiles={profiles}
            comments={comments}
            disabled={archived}
            disabledReason={archived ? "Assessment is archived" : undefined}
            onCommentAdded={handleCommentAdded}
            onCommentDeleted={handleCommentDeleted}
          />
        </div>
        <div>
          <h2 className="mb-3 text-lg font-semibold">Audit log</h2>
          <AuditLog entries={auditLog} profiles={profiles} />
        </div>
      </div>
    </div>
  );
}
