import { describe, it, expect } from "vitest";
import {
  isAssessmentComplete,
  isSummaryComplete,
} from "@/lib/completeness";
import type {
  AppAnalysis,
  DataFlow,
  Risk,
  ThresholdCheck,
} from "@/types/database";

function threshold(result: ThresholdCheck["result"]): ThresholdCheck {
  return {
    id: "t1",
    assessment_id: "a1",
    responses: {},
    result,
    completed_at: null,
    created_at: "",
    updated_at: "",
  };
}

function dataFlow(id: string): DataFlow {
  return {
    id,
    assessment_id: "a1",
    description: null,
    personal_info_types: [],
    collection_method: null,
    storage_location: null,
    access_controls: null,
    third_parties: [],
    retention_period: null,
    disposal_method: null,
    visual_data: null,
    sort_order: 0,
    created_at: "",
    updated_at: "",
  };
}

function appAnalysis(app_number: number): AppAnalysis {
  return {
    id: `app-${app_number}`,
    assessment_id: "a1",
    app_number,
    compliance_status: "not_assessed",
    responses: {},
    findings: null,
    recommendations: null,
    ai_suggestions: null,
    created_at: "",
    updated_at: "",
  };
}

function risk(id: string): Risk {
  return {
    id,
    assessment_id: "a1",
    description: "r",
    category: null,
    likelihood: "possible",
    consequence: "moderate",
    risk_score: 9,
    mitigation: null,
    residual_likelihood: null,
    residual_consequence: null,
    status: "identified",
    ai_suggested: false,
    created_at: "",
    updated_at: "",
  };
}

describe("isAssessmentComplete", () => {
  it("empty input => every section missing", () => {
    const r = isAssessmentComplete({
      threshold: null,
      dataFlows: [],
      appAnalyses: [],
      risks: [],
    });
    expect(r.complete).toBe(false);
    expect(r.missing.map((m) => m.section).sort()).toEqual([
      "app_analysis",
      "data_flow",
      "risks",
      "threshold",
    ]);
  });

  it("pending threshold counts as missing", () => {
    const r = isAssessmentComplete({
      threshold: threshold("pending"),
      dataFlows: [dataFlow("d1")],
      appAnalyses: Array.from({ length: 13 }, (_, i) => appAnalysis(i + 1)),
      risks: [risk("r1")],
    });
    expect(r.missing.some((m) => m.section === "threshold")).toBe(true);
  });

  it("all 13 APPs required", () => {
    const r = isAssessmentComplete({
      threshold: threshold("full_pia_required"),
      dataFlows: [dataFlow("d1")],
      appAnalyses: Array.from({ length: 12 }, (_, i) => appAnalysis(i + 1)),
      risks: [risk("r1")],
    });
    expect(r.complete).toBe(false);
    const appMissing = r.missing.find((m) => m.section === "app_analysis");
    expect(appMissing?.reason).toContain("13");
  });

  it("empty data flows, empty risks each count as missing", () => {
    const r = isAssessmentComplete({
      threshold: threshold("not_required"),
      dataFlows: [],
      appAnalyses: Array.from({ length: 13 }, (_, i) => appAnalysis(i + 1)),
      risks: [],
    });
    expect(r.missing.map((m) => m.section).sort()).toEqual([
      "data_flow",
      "risks",
    ]);
  });

  it("full data => complete", () => {
    const r = isAssessmentComplete({
      threshold: threshold("full_pia_required"),
      dataFlows: [dataFlow("d1")],
      appAnalyses: Array.from({ length: 13 }, (_, i) => appAnalysis(i + 1)),
      risks: [risk("r1")],
    });
    expect(r.complete).toBe(true);
    expect(r.missing).toEqual([]);
  });

  it("accepts pia_recommended and not_required as valid threshold results", () => {
    const base = {
      dataFlows: [dataFlow("d1")],
      appAnalyses: Array.from({ length: 13 }, (_, i) => appAnalysis(i + 1)),
      risks: [risk("r1")],
    };
    expect(
      isAssessmentComplete({ ...base, threshold: threshold("pia_recommended") })
        .complete
    ).toBe(true);
    expect(
      isAssessmentComplete({ ...base, threshold: threshold("not_required") })
        .complete
    ).toBe(true);
  });
});

describe("isSummaryComplete", () => {
  it("empty summary => all four missing", () => {
    const r = isSummaryComplete({
      thresholdResult: null,
      dataFlowCount: 0,
      appNumbers: [],
      risksCount: 0,
    });
    expect(r.complete).toBe(false);
    expect(r.missing).toHaveLength(4);
  });

  it("full summary => complete", () => {
    const r = isSummaryComplete({
      thresholdResult: "full_pia_required",
      dataFlowCount: 1,
      appNumbers: Array.from({ length: 13 }, (_, i) => i + 1),
      risksCount: 1,
    });
    expect(r.complete).toBe(true);
  });

  it("reports missing APP numbers in reason text", () => {
    const r = isSummaryComplete({
      thresholdResult: "full_pia_required",
      dataFlowCount: 1,
      appNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // missing 12 and 13
      risksCount: 1,
    });
    const missing = r.missing.find((m) => m.section === "app_analysis");
    expect(missing?.reason).toContain("12");
    expect(missing?.reason).toContain("13");
  });
});
