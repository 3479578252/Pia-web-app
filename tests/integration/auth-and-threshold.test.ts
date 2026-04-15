import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const TEST_EMAIL = process.env.TEST_USER_EMAIL!;
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD!;

function getAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

describe("Authentication", () => {
  describe("Login", () => {
    it("should login successfully with valid credentials", async () => {
      const supabase = getAnonClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      expect(error).toBeNull();
      expect(data.user).not.toBeNull();
      expect(data.user?.email).toBe(TEST_EMAIL);
      expect(data.session).not.toBeNull();
      expect(data.session?.access_token).toBeTruthy();
    });

    it("should fail with incorrect password", async () => {
      const supabase = getAnonClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: "wrong-password-12345",
      });

      expect(error).not.toBeNull();
      expect(error?.message).toBe("Invalid login credentials");
      expect(data.user).toBeNull();
      expect(data.session).toBeNull();
    });

    it("should fail with non-existent email", async () => {
      const supabase = getAnonClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "nonexistent@example.com",
        password: "some-password-123",
      });

      expect(error).not.toBeNull();
      expect(error?.message).toBe("Invalid login credentials");
      expect(data.user).toBeNull();
    });

    it("should fail with empty email", async () => {
      const supabase = getAnonClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "",
        password: TEST_PASSWORD,
      });

      expect(error).not.toBeNull();
      expect(data.user).toBeNull();
    });

    it("should fail with empty password", async () => {
      const supabase = getAnonClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: "",
      });

      expect(error).not.toBeNull();
      expect(data.user).toBeNull();
    });
  });

  describe("Session", () => {
    it("should return a valid session after login", async () => {
      const supabase = getAnonClient();
      await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      const {
        data: { session },
      } = await supabase.auth.getSession();

      expect(session).not.toBeNull();
      expect(session?.access_token).toBeTruthy();
      expect(session?.refresh_token).toBeTruthy();
      expect(session?.user?.email).toBe(TEST_EMAIL);
    });

    it("should refresh the session with a valid refresh token", async () => {
      const supabase = getAnonClient();
      const { data: loginData } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      const refreshToken = loginData.session?.refresh_token;
      expect(refreshToken).toBeTruthy();

      const { data: refreshData, error } =
        await supabase.auth.refreshSession();

      expect(error).toBeNull();
      expect(refreshData.session).not.toBeNull();
      expect(refreshData.session?.access_token).toBeTruthy();
    });

    it("should return user profile after login", async () => {
      const supabase = getAnonClient();
      await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();
      expect(user).not.toBeNull();

      // Fetch profile from DB
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();

      expect(error).toBeNull();
      expect(profile).not.toBeNull();
      expect(profile.email).toBe(TEST_EMAIL);
      expect(profile.role).toBeTruthy();
    });

    it("should not access protected data without login", async () => {
      const supabase = getAnonClient();
      // No login — try to access assessments
      const { data, error } = await supabase
        .from("assessments")
        .select("*");

      // RLS should block access — either empty array or null
      if (data !== null) {
        expect(data).toEqual([]);
      } else {
        // Some Supabase configs return null with an error for RLS-blocked tables
        expect(error).not.toBeNull();
      }
    });
  });
});

describe("Threshold Assessment (Integration)", () => {
  let supabase: SupabaseClient;
  let userId: string;
  let assessmentId: string;

  beforeAll(async () => {
    supabase = getAnonClient();
    const { data } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    userId = data.user!.id;

    // Create a test assessment
    const { data: assessment, error } = await supabase
      .from("assessments")
      .insert({
        title: `Test Assessment ${Date.now()}`,
        description: "Created by integration test",
        status: "draft",
        created_by: userId,
      })
      .select("id")
      .single();

    expect(error).toBeNull();
    assessmentId = assessment!.id;
  });

  it("should create a threshold check with full_pia_required when high-risk question is yes", async () => {
    const responses = {
      q1_sensitive_info: true,
      q2_profiling_ai: false,
      q3_surveillance: false,
      q4_overseas: false,
      q5_data_matching: false,
      q6_vulnerable: false,
      q7_new_collection: false,
      q8_large_scale: false,
      q9_new_technology: false,
      q10_public_interaction: false,
    };

    // Upsert threshold check
    const { error: upsertError } = await supabase
      .from("threshold_checks")
      .upsert(
        {
          assessment_id: assessmentId,
          responses,
          result: "full_pia_required",
          completed_at: new Date().toISOString(),
        },
        { onConflict: "assessment_id" }
      );

    expect(upsertError).toBeNull();

    // Verify it was saved
    const { data: saved, error: readError } = await supabase
      .from("threshold_checks")
      .select("*")
      .eq("assessment_id", assessmentId)
      .single();

    expect(readError).toBeNull();
    expect(saved).not.toBeNull();
    expect(saved.result).toBe("full_pia_required");
    expect(saved.responses).toEqual(responses);
    expect(saved.completed_at).toBeTruthy();
  });

  it("should update threshold check to pia_recommended", async () => {
    const responses = {
      q1_sensitive_info: false,
      q2_profiling_ai: false,
      q3_surveillance: false,
      q4_overseas: false,
      q5_data_matching: false,
      q6_vulnerable: false,
      q7_new_collection: true,
      q8_large_scale: true,
      q9_new_technology: false,
      q10_public_interaction: false,
    };

    const { error } = await supabase
      .from("threshold_checks")
      .update({
        responses,
        result: "pia_recommended",
        completed_at: new Date().toISOString(),
      })
      .eq("assessment_id", assessmentId);

    expect(error).toBeNull();

    const { data: saved } = await supabase
      .from("threshold_checks")
      .select("*")
      .eq("assessment_id", assessmentId)
      .single();

    expect(saved.result).toBe("pia_recommended");
    expect(saved.responses.q7_new_collection).toBe(true);
    expect(saved.responses.q8_large_scale).toBe(true);
  });

  it("should update threshold check to not_required", async () => {
    const responses = {
      q1_sensitive_info: false,
      q2_profiling_ai: false,
      q3_surveillance: false,
      q4_overseas: false,
      q5_data_matching: false,
      q6_vulnerable: false,
      q7_new_collection: false,
      q8_large_scale: false,
      q9_new_technology: false,
      q10_public_interaction: false,
    };

    const { error } = await supabase
      .from("threshold_checks")
      .update({
        responses,
        result: "not_required",
        completed_at: new Date().toISOString(),
      })
      .eq("assessment_id", assessmentId);

    expect(error).toBeNull();

    const { data: saved } = await supabase
      .from("threshold_checks")
      .select("*")
      .eq("assessment_id", assessmentId)
      .single();

    expect(saved.result).toBe("not_required");
  });

  it("should allow amending threshold responses after submission", async () => {
    // Change from not_required to full_pia_required
    const responses = {
      q1_sensitive_info: false,
      q2_profiling_ai: true, // changed to yes — high risk
      q3_surveillance: false,
      q4_overseas: false,
      q5_data_matching: false,
      q6_vulnerable: false,
      q7_new_collection: true,
      q8_large_scale: false,
      q9_new_technology: false,
      q10_public_interaction: false,
    };

    const { error } = await supabase
      .from("threshold_checks")
      .update({
        responses,
        result: "full_pia_required",
        completed_at: new Date().toISOString(),
      })
      .eq("assessment_id", assessmentId);

    expect(error).toBeNull();

    const { data: saved } = await supabase
      .from("threshold_checks")
      .select("*")
      .eq("assessment_id", assessmentId)
      .single();

    expect(saved.result).toBe("full_pia_required");
    expect(saved.responses.q2_profiling_ai).toBe(true);
  });

  it("should not allow a second threshold check for the same assessment (unique constraint)", async () => {
    const { error } = await supabase.from("threshold_checks").insert({
      assessment_id: assessmentId,
      responses: {},
      result: "pending",
    });

    expect(error).not.toBeNull();
    // Should be a unique constraint violation
    expect(error?.code).toBe("23505");
  });

  it("should not allow access to another user's assessment threshold", async () => {
    // Create a second anonymous client (not logged in)
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data } = await anonClient
      .from("threshold_checks")
      .select("*")
      .eq("assessment_id", assessmentId);

    // RLS should block this — empty array
    expect(data).toEqual([]);
  });

  // Cleanup: remove test assessment after all tests
  it("should clean up test assessment", async () => {
    const { error } = await supabase
      .from("assessments")
      .delete()
      .eq("id", assessmentId);

    expect(error).toBeNull();
  });
});
