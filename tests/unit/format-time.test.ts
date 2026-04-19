import { describe, it, expect } from "vitest";
import { relativeTime, absoluteTime, initialsFrom } from "@/lib/format-time";

const NOW = new Date("2026-04-19T14:32:00Z");

describe("relativeTime", () => {
  it("treats sub-30s differences as 'just now'", () => {
    const t = new Date(NOW.getTime() - 10_000).toISOString();
    expect(relativeTime(t, NOW)).toBe("just now");
  });

  it("reports minutes for sub-hour differences", () => {
    const t = new Date(NOW.getTime() - 5 * 60_000).toISOString();
    expect(relativeTime(t, NOW)).toMatch(/minute/);
  });

  it("reports hours for sub-day differences", () => {
    const t = new Date(NOW.getTime() - 3 * 60 * 60_000).toISOString();
    expect(relativeTime(t, NOW)).toMatch(/hour/);
  });

  it("reports days for sub-week differences", () => {
    const t = new Date(NOW.getTime() - 2 * 24 * 60 * 60_000).toISOString();
    expect(relativeTime(t, NOW)).toMatch(/day|yesterday/i);
  });

  it("reports months for sub-year differences", () => {
    const t = new Date(NOW.getTime() - 60 * 24 * 60 * 60_000).toISOString();
    expect(relativeTime(t, NOW)).toMatch(/month/);
  });

  it("reports years for older differences", () => {
    const t = new Date(NOW.getTime() - 2 * 365 * 24 * 60 * 60_000).toISOString();
    expect(relativeTime(t, NOW)).toMatch(/year/);
  });

  it("handles invalid dates safely", () => {
    expect(relativeTime("not-a-date", NOW)).toBe("");
  });
});

describe("absoluteTime", () => {
  it("returns a formatted local string", () => {
    const out = absoluteTime("2026-04-19T14:32:00Z");
    // Tolerant of locale: must be non-empty and include the year.
    expect(out.length).toBeGreaterThan(0);
    expect(out).toMatch(/2026/);
  });
});

describe("initialsFrom", () => {
  it("uses first+last initial for multi-word names", () => {
    expect(initialsFrom("Alice Wonder")).toBe("AW");
    expect(initialsFrom("Maria del Carmen Lopez")).toBe("ML");
  });

  it("uses first two characters for single-word names", () => {
    expect(initialsFrom("Alice")).toBe("AL");
    expect(initialsFrom("bo")).toBe("BO");
  });

  it("uppercases the output", () => {
    expect(initialsFrom("lower case name")).toBe("LN");
  });

  it("returns fallback for empty / null / undefined", () => {
    expect(initialsFrom(null)).toBe("?");
    expect(initialsFrom(undefined)).toBe("?");
    expect(initialsFrom("")).toBe("?");
    expect(initialsFrom("   ")).toBe("?");
    expect(initialsFrom(null, "PIA")).toBe("PIA");
  });
});
