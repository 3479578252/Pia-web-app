"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type {
  Assessment,
  AssessmentStatus,
  AuditAction,
  AuditDetails,
  AuditLogEntry,
  Comment,
  CommentSection,
  Profile,
} from "@/types/database";
import { canTransition } from "@/lib/review-transitions";
import { isCommentSection } from "@/lib/section-labels";
import type { SupabaseClient } from "@supabase/supabase-js";

// --------------------------------------------------------------
// Helpers (server-side; not exported via "use server")
// --------------------------------------------------------------

async function writeAuditLog(
  supabase: SupabaseClient,
  userId: string,
  assessmentId: string,
  action: AuditAction,
  details: AuditDetails
) {
  await supabase.from("audit_log").insert({
    assessment_id: assessmentId,
    user_id: userId,
    action,
    details: details as unknown as Record<string, unknown>,
  });
}

async function loadRole(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile["role"]> {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return (data?.role ?? null) as Profile["role"];
}

// --------------------------------------------------------------
// Status transitions
// --------------------------------------------------------------

export async function updateAssessmentStatus(
  assessmentId: string,
  nextStatus: AssessmentStatus
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: current, error: fetchError } = await supabase
    .from("assessments")
    .select("status")
    .eq("id", assessmentId)
    .single();

  if (fetchError || !current) {
    return { error: fetchError?.message ?? "Assessment not found" };
  }

  const fromStatus = (current as { status: AssessmentStatus }).status;
  if (fromStatus === nextStatus) {
    return { error: "Status unchanged" };
  }

  const role = await loadRole(supabase, user.id);
  const isPO = role === "privacy_officer";

  if (!canTransition(fromStatus, nextStatus, isPO)) {
    return { error: "Transition not permitted for this user or state" };
  }

  const { error } = await supabase
    .from("assessments")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", assessmentId);

  if (error) return { error: error.message };

  await writeAuditLog(supabase, user.id, assessmentId, "status_changed", {
    from: fromStatus,
    to: nextStatus,
  });

  return { success: true, from: fromStatus, to: nextStatus };
}

// --------------------------------------------------------------
// Comments (active = deleted_at IS NULL)
// --------------------------------------------------------------

export async function addComment(
  assessmentId: string,
  body: string,
  section: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const trimmed = body.trim();
  if (trimmed.length === 0) return { error: "Comment body is required" };

  if (!isCommentSection(section)) {
    return { error: "Invalid section tag" };
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      assessment_id: assessmentId,
      user_id: user.id,
      body: trimmed,
      section,
    })
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "Insert failed" };

  const inserted = data as Comment;

  await writeAuditLog(supabase, user.id, assessmentId, "comment_added", {
    comment_id: inserted.id,
    section: section as CommentSection,
  });

  return { success: true, comment: inserted };
}

export async function getComments(assessmentId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("assessment_id", assessmentId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) return { error: error.message, comments: [] as Comment[] };
  return { comments: (data as Comment[]) ?? [] };
}

export async function deleteComment(commentId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Soft-delete: RLS (comments_update) already enforces user_id = auth.uid().
  // The additional .eq filter is a defence-in-depth check.
  const { data, error } = await supabase
    .from("comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", commentId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .select("id, assessment_id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Comment not found or not deletable" };
  }

  const row = data as { id: string; assessment_id: string };
  await writeAuditLog(supabase, user.id, row.assessment_id, "comment_deleted", {
    comment_id: row.id,
  });

  return { success: true };
}

// --------------------------------------------------------------
// Audit log
// --------------------------------------------------------------

export async function getAuditLog(assessmentId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .eq("assessment_id", assessmentId)
    .order("created_at", { ascending: true });

  if (error) return { error: error.message, entries: [] as AuditLogEntry[] };
  return { entries: (data as AuditLogEntry[]) ?? [] };
}

// --------------------------------------------------------------
// Review page data bundle
// --------------------------------------------------------------

export interface ReviewBundle {
  assessment: Assessment;
  viewer: { id: string; role: Profile["role"]; displayName: string | null };
  profiles: Record<string, Pick<Profile, "id" | "display_name" | "email">>;
  comments: Comment[];
  auditLog: AuditLogEntry[];
  completeness: {
    threshold: unknown;
    dataFlowCount: number;
    appNumbers: number[];
    risksCount: number;
  };
}

export async function getReviewBundle(assessmentId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    assessmentRes,
    viewerRes,
    commentsRes,
    auditRes,
    thresholdRes,
    dataFlowsRes,
    appAnalysesRes,
    risksRes,
  ] = await Promise.all([
    supabase.from("assessments").select("*").eq("id", assessmentId).single(),
    supabase.from("profiles").select("id, role, display_name").eq("id", user.id).single(),
    supabase
      .from("comments")
      .select("*")
      .eq("assessment_id", assessmentId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("audit_log")
      .select("*")
      .eq("assessment_id", assessmentId)
      .order("created_at", { ascending: true }),
    supabase.from("threshold_checks").select("*").eq("assessment_id", assessmentId).maybeSingle(),
    supabase.from("data_flows").select("id").eq("assessment_id", assessmentId),
    supabase.from("app_analyses").select("app_number").eq("assessment_id", assessmentId),
    supabase.from("risks").select("id").eq("assessment_id", assessmentId),
  ]);

  const assessment = assessmentRes.data as Assessment | null;
  if (!assessment) return { error: "Assessment not found" };

  const comments = (commentsRes.data as Comment[]) ?? [];
  const auditLog = (auditRes.data as AuditLogEntry[]) ?? [];

  const userIds = Array.from(
    new Set([
      ...comments.map((c) => c.user_id),
      ...auditLog.map((e) => e.user_id),
    ])
  );

  const profilesMap: ReviewBundle["profiles"] = {};
  if (userIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, display_name, email")
      .in("id", userIds);
    for (const row of (profileRows as Pick<Profile, "id" | "display_name" | "email">[]) ?? []) {
      profilesMap[row.id] = row;
    }
  }

  const viewer = viewerRes.data as
    | { id: string; role: Profile["role"]; display_name: string | null }
    | null;

  const bundle: ReviewBundle = {
    assessment,
    viewer: {
      id: user.id,
      role: viewer?.role ?? null,
      displayName: viewer?.display_name ?? null,
    },
    profiles: profilesMap,
    comments,
    auditLog,
    completeness: {
      threshold: thresholdRes.data ?? null,
      dataFlowCount: ((dataFlowsRes.data as { id: string }[]) ?? []).length,
      appNumbers: ((appAnalysesRes.data as { app_number: number }[]) ?? []).map(
        (r) => r.app_number
      ),
      risksCount: ((risksRes.data as { id: string }[]) ?? []).length,
    },
  };

  return { bundle };
}
