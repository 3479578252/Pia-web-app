import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TEST_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD;

const hasEnv =
  !!SUPABASE_URL && !!SUPABASE_ANON_KEY && !!TEST_EMAIL && !!TEST_PASSWORD;

// Skip the whole suite if env not set — keeps CI and local unit runs clean.
describe.skipIf(!hasEnv)("Review workflow (integration)", () => {
  let supabase: SupabaseClient;
  let userId: string;
  let assessmentId: string;

  beforeAll(async () => {
    supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL!,
      password: TEST_PASSWORD!,
    });
    expect(error).toBeNull();
    userId = data.user!.id;

    const { data: asmt, error: asmtError } = await supabase
      .from("assessments")
      .insert({
        title: `Review integration test ${Date.now()}`,
        description: "Created by review-workflow.test.ts",
        status: "draft",
        created_by: userId,
      })
      .select("id")
      .single();
    expect(asmtError).toBeNull();
    assessmentId = asmt!.id;
  });

  afterAll(async () => {
    if (assessmentId) {
      await supabase.from("assessments").delete().eq("id", assessmentId);
    }
    await supabase.auth.signOut();
  });

  it("deleteComment performs a soft delete (row persists, deleted_at set)", async () => {
    const { data: inserted, error: insertError } = await supabase
      .from("comments")
      .insert({
        assessment_id: assessmentId,
        user_id: userId,
        body: "Soft-delete test body",
        section: "general",
      })
      .select("id")
      .single();
    expect(insertError).toBeNull();
    const commentId = inserted!.id;

    // Soft delete
    const { error: softDeleteError } = await supabase
      .from("comments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", commentId);
    expect(softDeleteError).toBeNull();

    // Row still exists
    const { data: row, error: fetchError } = await supabase
      .from("comments")
      .select("id, deleted_at, body")
      .eq("id", commentId)
      .maybeSingle();
    expect(fetchError).toBeNull();
    expect(row).not.toBeNull();
    expect(row!.deleted_at).not.toBeNull();
    expect(row!.body).toBe("Soft-delete test body");

    // Filtering by deleted_at IS NULL excludes it
    const { data: active } = await supabase
      .from("comments")
      .select("id")
      .eq("assessment_id", assessmentId)
      .is("deleted_at", null);
    const ids = (active ?? []).map((r) => r.id);
    expect(ids).not.toContain(commentId);

    // Cleanup: hard-delete for test hygiene
    await supabase.from("comments").delete().eq("id", commentId);
  });

  it("audit_log writes are constrained to user_id = auth.uid()", async () => {
    const validInsert = await supabase.from("audit_log").insert({
      assessment_id: assessmentId,
      user_id: userId,
      action: "status_changed",
      details: { from: "draft", to: "in_review" },
    });
    expect(validInsert.error).toBeNull();

    // Forging another user's ID should fail the WITH CHECK clause.
    const bogusId = "00000000-0000-0000-0000-000000000000";
    const badInsert = await supabase.from("audit_log").insert({
      assessment_id: assessmentId,
      user_id: bogusId,
      action: "status_changed",
      details: { from: "draft", to: "in_review" },
    });
    expect(badInsert.error).not.toBeNull();
  });

  it("audit_log rows can be read back for accessible assessments and are append-only", async () => {
    const { data: entries, error } = await supabase
      .from("audit_log")
      .select("*")
      .eq("assessment_id", assessmentId)
      .order("created_at", { ascending: true });
    expect(error).toBeNull();
    expect(Array.isArray(entries)).toBe(true);

    if (entries && entries.length > 0) {
      // No UPDATE policy exists; an update attempt should fail / return zero rows.
      const targetId = entries[0].id;
      const { data: updated } = await supabase
        .from("audit_log")
        .update({ action: "tampered" })
        .eq("id", targetId)
        .select("id");
      // Either rejected outright, or silently returns no rows because the
      // policy excludes it. Either way, no row should come back.
      expect(updated ?? []).toEqual([]);
    }
  });
});
