import type { CommentSection } from "@/types/database";

export const COMMENT_SECTIONS: readonly CommentSection[] = [
  "general",
  "threshold",
  "data_flow",
  "app_analysis",
  "risks",
] as const;

export const SECTION_LABELS: Record<CommentSection, string> = {
  general: "General comment",
  threshold: "Threshold assessment",
  data_flow: "Data flow mapping",
  app_analysis: "APP compliance analysis",
  risks: "Risk register",
};

export function sectionLabel(value: string | null | undefined): string {
  if (!value) return SECTION_LABELS.general;
  return (SECTION_LABELS as Record<string, string>)[value] ?? SECTION_LABELS.general;
}

export function isCommentSection(value: unknown): value is CommentSection {
  return typeof value === "string" && (COMMENT_SECTIONS as readonly string[]).includes(value);
}
