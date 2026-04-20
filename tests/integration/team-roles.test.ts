import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TEST_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD;

const hasEnv =
  !!SUPABASE_URL && !!SUPABASE_ANON_KEY && !!TEST_EMAIL && !!TEST_PASSWORD;

describe.skipIf(!hasEnv)("Team / roles / collaborators (integration)", () => {
  let supabase: SupabaseClient;
  let userId: string;
  let isPO = false;
  let poCount = 0;
  let assessmentId: string;
  let eligibleCollaboratorId: string | null = null;

  beforeAll(async () => {
    supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL!,
      password: TEST_PASSWORD!,
    });
    expect(error).toBeNull();
    userId = data.user!.id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    isPO = profile?.role === "privacy_officer";

    const { data: pos } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "privacy_officer");
    poCount = pos?.length ?? 0;

    // Find a non-PO, non-self profile we could add as a collaborator.
    const { data: others } = await supabase
      .from("profiles")
      .select("id, role")
      .neq("id", userId)
      .neq("role", "privacy_officer")
      .limit(1);
    eligibleCollaboratorId = others?.[0]?.id ?? null;

    const { data: asmt, error: asmtError } = await supabase
      .from("assessments")
      .insert({
        title: `Team roles integration ${Date.now()}`,
        description: "Created by team-roles.test.ts",
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

  it("team_member enum value is accepted (migration 00005 applied)", async () => {
    // We query the profiles table with the renamed value. A raw type
    // error from PostgREST would surface here; the migration is OK if
    // the filter runs without a syntax error even when zero rows match.
    const { error } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "team_member")
      .limit(1);
    expect(error).toBeNull();
  });

  it("freeze_created_by trigger blocks ownership transfer", async () => {
    const bogusId = "00000000-0000-0000-0000-000000000000";
    const { data, error } = await supabase
      .from("assessments")
      .update({ created_by: bogusId })
      .eq("id", assessmentId)
      .select("id");
    // Trigger raises; update returns no rows and an error message.
    expect(error).not.toBeNull();
    expect(data ?? []).toEqual([]);
  });

  it("last_po_guard blocks demotion of the sole privacy officer", async () => {
    if (!isPO || poCount !== 1) {
      return; // can't safely exercise this without risking state
    }
    const { error } = await supabase
      .from("profiles")
      .update({ role: "team_member" })
      .eq("id", userId);
    expect(error).not.toBeNull();

    const { data: check } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    expect(check?.role).toBe("privacy_officer");
  });

  it("collaborator add / remove round-trip writes to the join table", async () => {
    if (!isPO || !eligibleCollaboratorId) return;

    const insert = await supabase
      .from("assessment_collaborators")
      .insert({
        assessment_id: assessmentId,
        user_id: eligibleCollaboratorId,
        added_by: userId,
      })
      .select("assessment_id, user_id")
      .single();
    expect(insert.error).toBeNull();
    expect(insert.data?.user_id).toBe(eligibleCollaboratorId);

    const { data: row } = await supabase
      .from("assessment_collaborators")
      .select("user_id")
      .eq("assessment_id", assessmentId)
      .eq("user_id", eligibleCollaboratorId)
      .maybeSingle();
    expect(row?.user_id).toBe(eligibleCollaboratorId);

    const del = await supabase
      .from("assessment_collaborators")
      .delete()
      .eq("assessment_id", assessmentId)
      .eq("user_id", eligibleCollaboratorId);
    expect(del.error).toBeNull();

    const { data: after } = await supabase
      .from("assessment_collaborators")
      .select("user_id")
      .eq("assessment_id", assessmentId)
      .eq("user_id", eligibleCollaboratorId);
    expect(after ?? []).toEqual([]);
  });

  it("collaborator inserts blocked on archived assessments", async () => {
    if (!isPO || !eligibleCollaboratorId) return;

    // Flip the test assessment to archived
    const archive = await supabase
      .from("assessments")
      .update({ status: "archived" })
      .eq("id", assessmentId);
    expect(archive.error).toBeNull();

    const insert = await supabase.from("assessment_collaborators").insert({
      assessment_id: assessmentId,
      user_id: eligibleCollaboratorId,
      added_by: userId,
    });
    // RLS policy collab_insert WITH CHECK requires NOT archived.
    expect(insert.error).not.toBeNull();
    expect(insert.error?.code).toBe("42501");

    const { data: after } = await supabase
      .from("assessment_collaborators")
      .select("user_id")
      .eq("assessment_id", assessmentId)
      .eq("user_id", eligibleCollaboratorId);
    expect(after ?? []).toEqual([]);

    // Restore
    await supabase
      .from("assessments")
      .update({ status: "draft" })
      .eq("id", assessmentId);
  });
});
