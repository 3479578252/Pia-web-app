"use client";

import { useState, useMemo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type {
  AssessmentStatus,
  AuditLogEntry,
  CommentSection,
  Profile,
} from "@/types/database";
import { relativeTime, absoluteTime, initialsFrom } from "@/lib/format-time";
import { SECTION_LABELS } from "@/lib/section-labels";

type ProfileSummary = Pick<Profile, "id" | "display_name" | "email">;

interface Props {
  entries: AuditLogEntry[];
  profiles: Record<string, ProfileSummary>;
}

const STATUS_LABELS: Record<AssessmentStatus, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  archived: "Archived",
};

function describe(entry: AuditLogEntry): string {
  const details = (entry.details ?? {}) as Record<string, unknown>;
  switch (entry.action) {
    case "status_changed": {
      const from = STATUS_LABELS[details.from as AssessmentStatus] ?? String(details.from);
      const to = STATUS_LABELS[details.to as AssessmentStatus] ?? String(details.to);
      if (details.from === "archived" && details.to === "draft") {
        return "Unarchived assessment (back to Draft)";
      }
      return `Changed status from ${from} to ${to}`;
    }
    case "comment_added": {
      const section = (details.section as CommentSection) ?? "general";
      return `Added a comment (${SECTION_LABELS[section] ?? section})`;
    }
    case "comment_deleted":
      return "Deleted a comment";
    default:
      return entry.action;
  }
}

function category(action: string): "status" | "comment" {
  return action === "status_changed" ? "status" : "comment";
}

export function AuditLog({ entries, profiles }: Props) {
  const [showStatus, setShowStatus] = useState(true);
  const [showComments, setShowComments] = useState(true);

  const filtered = useMemo(
    () =>
      entries.filter((e) => {
        const cat = category(e.action);
        if (cat === "status" && !showStatus) return false;
        if (cat === "comment" && !showComments) return false;
        return true;
      }),
    [entries, showStatus, showComments]
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium">Filter:</span>
        <label className="inline-flex items-center gap-1">
          <input
            type="checkbox"
            checked={showStatus}
            onChange={(e) => setShowStatus(e.target.checked)}
          />
          Status changes
        </label>
        <label className="inline-flex items-center gap-1">
          <input
            type="checkbox"
            checked={showComments}
            onChange={(e) => setShowComments(e.target.checked)}
          />
          Comments
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No audit entries.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {filtered.map((entry) => {
            const author = profiles[entry.user_id];
            const name =
              author?.display_name || author?.email || "Unknown user";
            const initials = initialsFrom(author?.display_name || author?.email);
            return (
              <li
                key={entry.id}
                className="flex items-start gap-3 rounded-md border bg-card p-3"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {entry.action}
                    </Badge>
                    <span
                      className="text-xs text-muted-foreground"
                      title={absoluteTime(entry.created_at)}
                    >
                      {relativeTime(entry.created_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-muted-foreground">{describe(entry)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
