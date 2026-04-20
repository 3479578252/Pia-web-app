"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { addCollaborator, removeCollaborator } from "./actions";
import type { CollaboratorRow } from "./actions";
import type { Profile } from "@/types/database";

type AssignableProfile = Pick<Profile, "id" | "display_name" | "email">;

interface Props {
  assessmentId: string;
  creatorName: string | null;
  collaborators: CollaboratorRow[];
  assignableProfiles: AssignableProfile[];
  canManage: boolean;
  archived: boolean;
}

function displayName(p: { display_name: string | null; email: string }) {
  return p.display_name || p.email;
}

export function CollaboratorsPanel({
  assessmentId,
  creatorName,
  collaborators,
  assignableProfiles,
  canManage,
  archived,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [selected, setSelected] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!selected) return;
    setBusy("add");
    setError(null);
    const result = await addCollaborator(assessmentId, selected);
    setBusy(null);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setSelected("");
    startTransition(() => router.refresh());
  }

  async function handleRemove(userId: string) {
    setBusy(userId);
    setError(null);
    const result = await removeCollaborator(assessmentId, userId);
    setBusy(null);
    if (result?.error) {
      setError(result.error);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Collaborators</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {creatorName || "Unknown creator"}
              </p>
              <p className="text-xs text-muted-foreground">Creator</p>
            </div>
            <Badge variant="outline" className="text-xs">
              Owner
            </Badge>
          </div>
        </div>

        {collaborators.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No collaborators yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {collaborators.map((c) => (
              <li
                key={c.user_id}
                className="flex items-center justify-between rounded-md border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{displayName(c)}</p>
                  <p className="text-xs text-muted-foreground">{c.email}</p>
                </div>
                {canManage && (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove ${displayName(c)}`}
                    disabled={busy === c.user_id}
                    onClick={() => handleRemove(c.user_id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {canManage && (
          <div className="space-y-2 pt-2">
            <label htmlFor="collab-select" className="text-xs font-medium text-muted-foreground">
              Add collaborator
            </label>
            <div className="flex items-center gap-2">
              <select
                id="collab-select"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                disabled={busy !== null || assignableProfiles.length === 0}
                className="h-9 flex-1 rounded-md border border-input bg-transparent px-2 text-sm"
              >
                <option value="">
                  {assignableProfiles.length === 0
                    ? "No eligible users"
                    : "Select a user"}
                </option>
                {assignableProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {displayName(p)}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={!selected || busy !== null}
              >
                <UserPlus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </div>
          </div>
        )}

        {archived && (
          <p className="text-xs text-muted-foreground">
            Unarchive the assessment to change collaborators.
          </p>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
