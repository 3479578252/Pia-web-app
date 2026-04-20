import { describe, it, expect } from "vitest";
import { canEditThreshold } from "@/lib/threshold-permissions";

describe("canEditThreshold", () => {
  it("allows privacy_officer", () => {
    expect(canEditThreshold("privacy_officer")).toBe(true);
  });

  it("allows project_manager", () => {
    expect(canEditThreshold("project_manager")).toBe(true);
  });

  it("blocks team_member", () => {
    expect(canEditThreshold("team_member")).toBe(false);
  });

  it("blocks null (no role)", () => {
    expect(canEditThreshold(null)).toBe(false);
  });
});
