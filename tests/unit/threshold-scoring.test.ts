import { describe, it, expect } from "vitest";
import {
  calculateThresholdResult,
  THRESHOLD_QUESTIONS,
  type ThresholdResponses,
} from "@/lib/threshold-questions";

// Helper: create responses with all "no"
function allNo(): ThresholdResponses {
  const responses: ThresholdResponses = {};
  THRESHOLD_QUESTIONS.forEach((q) => {
    responses[q.id] = false;
  });
  return responses;
}

// Helper: create responses with all "yes"
function allYes(): ThresholdResponses {
  const responses: ThresholdResponses = {};
  THRESHOLD_QUESTIONS.forEach((q) => {
    responses[q.id] = true;
  });
  return responses;
}

// Helper: create responses with specific questions answered "yes"
function yesTo(...questionIds: string[]): ThresholdResponses {
  const responses = allNo();
  questionIds.forEach((id) => {
    responses[id] = true;
  });
  return responses;
}

describe("Threshold Questions Configuration", () => {
  it("should have exactly 10 questions", () => {
    expect(THRESHOLD_QUESTIONS).toHaveLength(10);
  });

  it("should have 6 high-risk questions", () => {
    const highRisk = THRESHOLD_QUESTIONS.filter(
      (q) => q.category === "high_risk"
    );
    expect(highRisk).toHaveLength(6);
  });

  it("should have 4 standard questions", () => {
    const standard = THRESHOLD_QUESTIONS.filter(
      (q) => q.category === "standard"
    );
    expect(standard).toHaveLength(4);
  });

  it("should have unique IDs for all questions", () => {
    const ids = THRESHOLD_QUESTIONS.map((q) => q.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should have non-empty text, helpText, and source for all questions", () => {
    THRESHOLD_QUESTIONS.forEach((q) => {
      expect(q.text.length).toBeGreaterThan(0);
      expect(q.helpText.length).toBeGreaterThan(0);
      expect(q.source.length).toBeGreaterThan(0);
    });
  });
});

describe("calculateThresholdResult", () => {
  describe("not_required outcome", () => {
    it("should return not_required when all answers are no", () => {
      const result = calculateThresholdResult(allNo());
      expect(result).toBe("not_required");
    });

    it("should return not_required with only 1 standard yes", () => {
      const result = calculateThresholdResult(yesTo("q7_new_collection"));
      expect(result).toBe("not_required");
    });

    it("should return not_required with 1 standard yes (any single standard question)", () => {
      const standardQuestions = THRESHOLD_QUESTIONS.filter(
        (q) => q.category === "standard"
      );
      standardQuestions.forEach((q) => {
        const result = calculateThresholdResult(yesTo(q.id));
        expect(result).toBe("not_required");
      });
    });
  });

  describe("pia_recommended outcome", () => {
    it("should return pia_recommended with exactly 2 standard yes answers", () => {
      const result = calculateThresholdResult(
        yesTo("q7_new_collection", "q8_large_scale")
      );
      expect(result).toBe("pia_recommended");
    });

    it("should return pia_recommended with 3 standard yes answers", () => {
      const result = calculateThresholdResult(
        yesTo("q7_new_collection", "q8_large_scale", "q9_new_technology")
      );
      expect(result).toBe("pia_recommended");
    });

    it("should return pia_recommended with all 4 standard yes answers", () => {
      const result = calculateThresholdResult(
        yesTo(
          "q7_new_collection",
          "q8_large_scale",
          "q9_new_technology",
          "q10_public_interaction"
        )
      );
      expect(result).toBe("pia_recommended");
    });
  });

  describe("full_pia_required outcome", () => {
    it("should return full_pia_required when sensitive info is yes", () => {
      const result = calculateThresholdResult(yesTo("q1_sensitive_info"));
      expect(result).toBe("full_pia_required");
    });

    it("should return full_pia_required when profiling/AI is yes", () => {
      const result = calculateThresholdResult(yesTo("q2_profiling_ai"));
      expect(result).toBe("full_pia_required");
    });

    it("should return full_pia_required when surveillance is yes", () => {
      const result = calculateThresholdResult(yesTo("q3_surveillance"));
      expect(result).toBe("full_pia_required");
    });

    it("should return full_pia_required when overseas disclosure is yes", () => {
      const result = calculateThresholdResult(yesTo("q4_overseas"));
      expect(result).toBe("full_pia_required");
    });

    it("should return full_pia_required when data matching is yes", () => {
      const result = calculateThresholdResult(yesTo("q5_data_matching"));
      expect(result).toBe("full_pia_required");
    });

    it("should return full_pia_required when vulnerable individuals is yes", () => {
      const result = calculateThresholdResult(yesTo("q6_vulnerable"));
      expect(result).toBe("full_pia_required");
    });

    it("should return full_pia_required for each individual high-risk question", () => {
      const highRiskQuestions = THRESHOLD_QUESTIONS.filter(
        (q) => q.category === "high_risk"
      );
      highRiskQuestions.forEach((q) => {
        const result = calculateThresholdResult(yesTo(q.id));
        expect(result).toBe("full_pia_required");
      });
    });

    it("should return full_pia_required when all answers are yes", () => {
      const result = calculateThresholdResult(allYes());
      expect(result).toBe("full_pia_required");
    });

    it("should return full_pia_required when high-risk yes overrides standard count", () => {
      // Even with no standard yes, a single high-risk yes triggers full PIA
      const result = calculateThresholdResult(yesTo("q1_sensitive_info"));
      expect(result).toBe("full_pia_required");
    });

    it("should return full_pia_required when high-risk yes combined with standard yes", () => {
      const result = calculateThresholdResult(
        yesTo("q1_sensitive_info", "q7_new_collection", "q8_large_scale")
      );
      expect(result).toBe("full_pia_required");
    });
  });

  describe("edge cases", () => {
    it("should handle empty responses (all questions unanswered treated as no)", () => {
      const result = calculateThresholdResult({});
      expect(result).toBe("not_required");
    });

    it("should handle partial responses", () => {
      // Only some questions answered, all no
      const result = calculateThresholdResult({
        q1_sensitive_info: false,
        q7_new_collection: false,
      });
      expect(result).toBe("not_required");
    });

    it("should prioritise high-risk over standard count", () => {
      // Multiple standard yes AND a high-risk yes → full_pia_required (not pia_recommended)
      const result = calculateThresholdResult(
        yesTo(
          "q3_surveillance",
          "q7_new_collection",
          "q8_large_scale",
          "q9_new_technology",
          "q10_public_interaction"
        )
      );
      expect(result).toBe("full_pia_required");
    });

    it("should never return pending", () => {
      // The function should always return a definitive result
      const results = [
        calculateThresholdResult(allNo()),
        calculateThresholdResult(allYes()),
        calculateThresholdResult({}),
        calculateThresholdResult(yesTo("q7_new_collection", "q8_large_scale")),
      ];
      results.forEach((result) => {
        expect(result).not.toBe("pending");
      });
    });
  });
});
