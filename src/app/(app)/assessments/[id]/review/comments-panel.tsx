"use client";

import { useState, useTransition } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { relativeTime, absoluteTime, initialsFrom } from "@/lib/format-time";
import { COMMENT_SECTIONS, SECTION_LABELS } from "@/lib/section-labels";
import type { Comment, CommentSection, Profile } from "@/types/database";
import { addComment, deleteComment } from "./actions";

type ProfileSummary = Pick<Profile, "id" | "display_name" | "email">;

interface Props {
  assessmentId: string;
  viewerId: string;
  profiles: Record<string, ProfileSummary>;
  comments: Comment[];
  disabled: boolean;
  disabledReason?: string;
  onCommentAdded: (comment: Comment, author: ProfileSummary) => void;
  onCommentDeleted: (commentId: string) => void;
}

export function CommentsPanel({
  assessmentId,
  viewerId,
  profiles,
  comments,
  disabled,
  disabledReason,
  onCommentAdded,
  onCommentDeleted,
}: Props) {
  const [body, setBody] = useState("");
  const [section, setSection] = useState<CommentSection>("general");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;
    const trimmed = body.trim();
    if (trimmed.length === 0) {
      setError("Comment cannot be empty");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await addComment(assessmentId, trimmed, section);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      if (result.comment) {
        const author: ProfileSummary = profiles[viewerId] ?? {
          id: viewerId,
          display_name: null,
          email: "",
        };
        onCommentAdded(result.comment, author);
      }
      setBody("");
      setSection("general");
    });
  }

  function handleDelete(commentId: string) {
    if (disabled) return;
    if (!window.confirm("Delete this comment? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await deleteComment(commentId);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      onCommentDeleted(commentId);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 rounded-lg border bg-card p-4"
      >
        <label className="text-sm font-medium" htmlFor="comment-body">
          Add a comment
        </label>
        <Textarea
          id="comment-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share feedback or raise a concern…"
          rows={3}
          disabled={disabled || isPending}
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-muted-foreground" htmlFor="comment-section">
            Section:
          </label>
          <select
            id="comment-section"
            value={section}
            onChange={(e) => setSection(e.target.value as CommentSection)}
            disabled={disabled || isPending}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            {COMMENT_SECTIONS.map((s) => (
              <option key={s} value={s}>
                {SECTION_LABELS[s]}
              </option>
            ))}
          </select>
          <div className="ml-auto flex items-center gap-2">
            {error && <span className="text-sm text-destructive">{error}</span>}
            <Button
              type="submit"
              size="sm"
              disabled={disabled || isPending || body.trim().length === 0}
              title={disabled ? disabledReason : undefined}
            >
              {isPending ? "Posting…" : "Post comment"}
            </Button>
          </div>
        </div>
        {disabled && disabledReason && (
          <p className="text-xs text-muted-foreground">{disabledReason}</p>
        )}
      </form>

      <div className="flex flex-col gap-3">
        {comments.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No comments yet.
          </p>
        ) : (
          comments.map((c) => {
            const author = profiles[c.user_id];
            const name =
              author?.display_name || author?.email || "Unknown user";
            const initials = initialsFrom(author?.display_name || author?.email);
            const sectionKey = (c.section ?? "general") as CommentSection;
            const sectionLabel =
              SECTION_LABELS[sectionKey] ?? SECTION_LABELS.general;
            const isOwn = c.user_id === viewerId;

            return (
              <div
                key={c.id}
                className="flex gap-3 rounded-lg border bg-card p-4"
              >
                <Avatar>
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{name}</span>
                    <Badge variant="outline" className="text-xs">
                      {sectionLabel}
                    </Badge>
                    <span
                      className="text-xs text-muted-foreground"
                      title={absoluteTime(c.created_at)}
                    >
                      {relativeTime(c.created_at)}
                    </span>
                    {isOwn && !disabled && (
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                        title="Delete your comment"
                        disabled={isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
