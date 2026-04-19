import { describe, it, expect } from "vitest";
import {
  COMMENT_SECTIONS,
  SECTION_LABELS,
  sectionLabel,
  isCommentSection,
} from "@/lib/section-labels";

describe("COMMENT_SECTIONS", () => {
  it("contains the five expected values", () => {
    expect([...COMMENT_SECTIONS].sort()).toEqual([
      "app_analysis",
      "data_flow",
      "general",
      "risks",
      "threshold",
    ]);
  });

  it("has a label for every key", () => {
    for (const key of COMMENT_SECTIONS) {
      expect(SECTION_LABELS[key]).toBeTruthy();
      expect(SECTION_LABELS[key].length).toBeGreaterThan(0);
    }
  });
});

describe("sectionLabel", () => {
  it("returns the display label for known values", () => {
    expect(sectionLabel("threshold")).toBe("Threshold assessment");
    expect(sectionLabel("data_flow")).toBe("Data flow mapping");
    expect(sectionLabel("app_analysis")).toBe("APP compliance analysis");
    expect(sectionLabel("risks")).toBe("Risk register");
    expect(sectionLabel("general")).toBe("General comment");
  });

  it("falls back to the general label for null/undefined/unknown", () => {
    expect(sectionLabel(null)).toBe("General comment");
    expect(sectionLabel(undefined)).toBe("General comment");
    expect(sectionLabel("")).toBe("General comment");
    expect(sectionLabel("totally_unknown")).toBe("General comment");
  });
});

describe("isCommentSection", () => {
  it("accepts all known snake_case values", () => {
    for (const key of COMMENT_SECTIONS) {
      expect(isCommentSection(key)).toBe(true);
    }
  });

  it("rejects unknown strings, wrong-case variants, and non-strings", () => {
    expect(isCommentSection("data-flow")).toBe(false); // kebab-case not stored
    expect(isCommentSection("Threshold")).toBe(false); // title-case not stored
    expect(isCommentSection("")).toBe(false);
    expect(isCommentSection(null)).toBe(false);
    expect(isCommentSection(undefined)).toBe(false);
    expect(isCommentSection(123)).toBe(false);
    expect(isCommentSection({ section: "general" })).toBe(false);
  });
});
