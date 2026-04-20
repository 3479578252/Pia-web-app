"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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
  { value: "privacy_officer", label: "Privacy Officer" },
  { value: "project_manager", label: "Project Manager" },
  { value: "team_member", label: "Team Member" },
];

export default function TeamPage() {
  const supabase = createClient();
  const [members, setMembers] = useState<Profile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });
    if (data) setMembers(data);
  }, [supabase]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  async function handleRoleChange(userId: string, role: UserRole) {
    setSaving(userId);
    await updateUserRole(userId, role);
    loadMembers();
    setSaving(null);
  }

  function getInitials(profile: Profile) {
    const name = profile.display_name || profile.email;
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  const roleColors: Record<string, "default" | "secondary" | "outline"> = {
    privacy_officer: "default",
    project_manager: "secondary",
    other: "outline",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Team Members</h2>
        <p className="text-muted-foreground">
          Manage your organisation&apos;s team and assign roles.
        </p>
      </div>

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
                    {member.id !== currentUserId && (
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
