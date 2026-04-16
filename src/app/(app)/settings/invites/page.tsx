"use client";

import { useState, useEffect, useCallback } from "react";
import { Copy, Mail, Link2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createEmailInvite, createCodeInvite, revokeInvite } from "../actions";
import type { Invite, UserRole } from "@/types/database";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "project_manager", label: "Project Manager" },
  { value: "other", label: "Team Member" },
];

export default function InvitesPage() {
  const supabase = createClient();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("project_manager");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadInvites = useCallback(async () => {
    const { data } = await supabase
      .from("invites")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setInvites(data);
  }, [supabase]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const [emailSent, setEmailSent] = useState(false);

  async function handleEmailInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setEmailSent(false);
    const result = await createEmailInvite(email, role);
    if (result.error) {
      setError(result.error);
    } else {
      setEmail("");
      setGeneratedCode(result.code ?? null);
      if ("emailSent" in result && result.emailSent) {
        setEmailSent(true);
      }
      if ("emailError" in result && result.emailError) {
        setError(`Invite created but email failed: ${result.emailError}`);
      }
      loadInvites();
    }
    setLoading(false);
  }

  async function handleCodeInvite() {
    setLoading(true);
    setError(null);
    const result = await createCodeInvite(role);
    if (result.error) {
      setError(result.error);
    } else {
      setGeneratedCode(result.code ?? null);
      loadInvites();
    }
    setLoading(false);
  }

  async function handleRevoke(inviteId: string) {
    await revokeInvite(inviteId);
    loadInvites();
  }

  function copyInviteLink(code: string) {
    const link = `${window.location.origin}/signup?code=${code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "outline",
    accepted: "default",
    expired: "secondary",
    revoked: "destructive",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Invite Team Members</h2>
        <p className="text-muted-foreground">
          Invite people to join your organisation&apos;s PIA workspace.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5" />
              Invite by email
            </CardTitle>
            <CardDescription>
              Send an invite to a specific email address.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <select
                  id="invite-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Sending..." : "Send invite"}
              </Button>
              {emailSent && (
                <p className="text-sm text-green-600">
                  Invite email sent successfully.
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Link2 className="h-5 w-5" />
              Generate invite code
            </CardTitle>
            <CardDescription>
              Create a shareable code that anyone can use to sign up.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code-role">Role</Label>
              <select
                id="code-role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={handleCodeInvite}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              Generate code
            </Button>
            {generatedCode && (
              <div className="rounded-md border bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  Share this link:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono truncate">
                    /signup?code={generatedCode}
                  </code>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => copyInviteLink(generatedCode)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {copied && (
                  <p className="text-xs text-green-600 mt-1">
                    Copied to clipboard
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invite history</CardTitle>
        </CardHeader>
        <CardContent>
          {invites.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invites yet.</p>
          ) : (
            <div className="space-y-2">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {invite.email || `Code: ${invite.code}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Role: {invite.role.replace("_", " ")} | Expires:{" "}
                      {new Date(invite.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusColors[invite.status]}>
                      {invite.status}
                    </Badge>
                    {invite.status === "pending" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRevoke(invite.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
