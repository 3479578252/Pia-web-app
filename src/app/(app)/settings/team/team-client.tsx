"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { updateUserRole } from "../actions";
import type { Profile, UserRole } from "@/types/database";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "project_manager", label: "Project Manager" },
  { value: "team_member", label: "Team Member" },
];

const roleColors: Record<string, "default" | "secondary" | "outline"> = {
  privacy_officer: "default",
  project_manager: "secondary",
  team_member: "outline",
};

function getInitials(profile: Profile) {
  const name = profile.display_name || profile.email;
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function TeamClient({
  members,
  currentUserId,
}: {
  members: Profile[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleRoleChange(userId: string, role: UserRole) {
    setSaving(userId);
    setError(null);
    const result = await updateUserRole(userId, role);
    setSaving(null);
    if (result?.error) {
      setError(result.error);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Team Members</h2>
        <p className="text-muted-foreground">
          Manage your organisation&apos;s team and assign roles.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No team members yet.
            </p>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-md border p-4"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{getInitials(member)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {member.display_name || "Unnamed"}
                        {member.id === currentUserId && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (you)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {member.role ? (
                      <Badge variant={roleColors[member.role]}>
                        {member.role.replace("_", " ")}
                      </Badge>
                    ) : (
                      <Badge variant="outline">No role</Badge>
                    )}
                    {member.id !== currentUserId &&
                      member.role !== "privacy_officer" && (
                        <select
                          value={member.role || ""}
                          onChange={(e) =>
                            handleRoleChange(
                              member.id,
                              e.target.value as UserRole
                            )
                          }
                          disabled={saving === member.id}
                          className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                        >
                          <option value="" disabled>
                            Assign role
                          </option>
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
