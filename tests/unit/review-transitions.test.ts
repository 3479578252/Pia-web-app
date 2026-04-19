import { describe, it, expect } from "vitest";
import {
  availableTransitions,
  canTransition,
  transitionRule,
} from "@/lib/review-transitions";
import type { AssessmentStatus } from "@/types/database";

const STATUSES: AssessmentStatus[] = [
  "draft",
  "in_review",
  "approved",
  "archived",
];

describe("transitionRule", () => {
  it("returns forbidden for same-state transitions", () => {
    STATUSES.forEach((s) => {
      expect(transitionRule(s, s)).toBe("forbidden");
    });
  });

  it("draft -> in_review is anyone", () => {
    expect(transitionRule("draft", "in_review")).toBe("anyone");
  });

  it("draft -> approved is forbidden (must go via in_review)", () => {
    expect(transitionRule("draft", "approved")).toBe("forbidden");
  });

  it("draft -> archived is anyone", () => {
    expect(transitionRule("draft", "archived")).toBe("anyone");
  });

  it("in_review -> approved is privacy_officer", () => {
    expect(transitionRule("in_review", "approved")).toBe("privacy_officer");
  });

  it("in_review -> draft is privacy_officer", () => {
    expect(transitionRule("in_review", "draft")).toBe("privacy_officer");
  });

  it("in_review -> archived is anyone", () => {
    expect(transitionRule("in_review", "archived")).toBe("anyone");
  });

  it("approved -> draft is privacy_officer (revert)", () => {
    expect(transitionRule("approved", "draft")).toBe("privacy_officer");
  });

  it("approved -> archived is anyone", () => {
    expect(transitionRule("approved", "archived")).toBe("anyone");
  });

  it("archived -> draft is privacy_officer (unarchive)", () => {
    expect(transitionRule("archived", "draft")).toBe("privacy_officer");
  });

  it("archived -> in_review / approved are forbidden", () => {
    expect(transitionRule("archived", "in_review")).toBe("forbidden");
    expect(transitionRule("archived", "approved")).toBe("forbidden");
  });
});

describe("canTransition", () => {
  it("permits anyone-transitions for both roles", () => {
    expect(canTransition("draft", "in_review", false)).toBe(true);
    expect(canTransition("draft", "in_review", true)).toBe(true);
    expect(canTransition("approved", "archived", false)).toBe(true);
  });

  it("blocks privacy_officer-only transitions for non-PO", () => {
    expect(canTransition("in_review", "approved", false)).toBe(false);
    expect(canTransition("approved", "draft", false)).toBe(false);
    expect(canTransition("archived", "draft", false)).toBe(false);
  });

  it("allows privacy_officer-only transitions for PO", () => {
    expect(canTransition("in_review", "approved", true)).toBe(true);
    expect(canTransition("approved", "draft", true)).toBe(true);
    expect(canTransition("archived", "draft", true)).toBe(true);
  });

  it("always blocks forbidden transitions regardless of role", () => {
    expect(canTransition("draft", "approved", true)).toBe(false);
    expect(canTransition("archived", "approved", true)).toBe(false);
    expect(canTransition("in_review", "in_review", true)).toBe(false);
  });
});

describe("availableTransitions", () => {
  it("from draft: submit for review + archive", () => {
    const opts = availableTransitions("draft");
    expect(opts.map((o) => o.to).sort()).toEqual(["archived", "in_review"]);
    expect(opts.find((o) => o.to === "in_review")?.requiresPrivacyOfficer).toBe(
      false
    );
  });

  it("from in_review: approve (PO) + revert (PO) + archive", () => {
    const opts = availableTransitions("in_review");
    const tos = opts.map((o) => o.to).sort();
    expect(tos).toEqual(["approved", "archived", "draft"]);
    expect(opts.find((o) => o.to === "approved")?.requiresPrivacyOfficer).toBe(
      true
    );
    expect(opts.find((o) => o.to === "draft")?.requiresPrivacyOfficer).toBe(
      true
    );
    expect(opts.find((o) => o.to === "archived")?.requiresPrivacyOfficer).toBe(
      false
    );
  });

  it("from approved: revert (PO) + archive", () => {
    const opts = availableTransitions("approved");
    expect(opts.map((o) => o.to).sort()).toEqual(["archived", "draft"]);
    expect(opts.find((o) => o.to === "draft")?.requiresPrivacyOfficer).toBe(
      true
    );
  });

  it("from archived: only unarchive (PO -> draft)", () => {
    const opts = availableTransitions("archived");
    expect(opts).toHaveLength(1);
    expect(opts[0].to).toBe("draft");
    expect(opts[0].requiresPrivacyOfficer).toBe(true);
    expect(opts[0].label).toBe("Unarchive");
  });
});
