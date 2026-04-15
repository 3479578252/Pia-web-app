"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, UserCheck, Briefcase, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { UserRole } from "@/types/database";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isFirstUser, setIsFirstUser] = useState(false);
  const [assignedRole, setAssignedRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, onboarding_complete")
        .eq("id", user.id)
        .single();

      if (profile?.onboarding_complete) {
        router.push("/dashboard");
        return;
      }

      // First user is auto-assigned privacy officer in the DB trigger
      if (profile?.role === "privacy_officer") {
        setIsFirstUser(true);
        setAssignedRole("privacy_officer");
      } else if (profile?.role) {
        setAssignedRole(profile.role);
      }

      setLoading(false);
    }
    checkStatus();
  }, [supabase, router]);

  async function completeOnboarding() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({ onboarding_complete: true })
      .eq("id", user.id);

    router.push("/dashboard");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const roleInfo: Record<
    UserRole,
    { icon: React.ReactNode; title: string; description: string }
  > = {
    privacy_officer: {
      icon: <Shield className="h-8 w-8" />,
      title: "Privacy Officer",
      description:
        "Full access to all assessments, approval authority, team management, and organisation settings.",
    },
    project_manager: {
      icon: <Briefcase className="h-8 w-8" />,
      title: "Project Manager",
      description:
        "Create and manage your own Privacy Impact Assessments. Submit for review when complete.",
    },
    other: {
      icon: <User className="h-8 w-8" />,
      title: "Team Member",
      description:
        "Contribute to assessments you've been assigned to. View your own work.",
    },
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <UserCheck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Welcome to PIA</h1>
          <p className="mt-2 text-muted-foreground">
            Privacy Impact Assessment tool for your organisation
          </p>
        </div>

        {isFirstUser && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <p className="text-center text-sm">
                You&apos;re the first user — you&apos;ve been automatically
                assigned as the <strong>Privacy Officer</strong>. You can invite
                team members from the settings page after setup.
              </p>
            </CardContent>
          </Card>
        )}

        {assignedRole ? (
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Your role</CardTitle>
              <CardDescription>
                {isFirstUser
                  ? "As the first user, you are the Privacy Officer."
                  : "Your role has been assigned by the Privacy Officer."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4 rounded-lg border bg-card p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {roleInfo[assignedRole].icon}
                </div>
                <div>
                  <h3 className="font-semibold">
                    {roleInfo[assignedRole].title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {roleInfo[assignedRole].description}
                  </p>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={completeOnboarding}
                disabled={saving}
              >
                {saving ? "Setting up..." : "Get started"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Waiting for role assignment</CardTitle>
              <CardDescription>
                Your Privacy Officer will assign your role shortly. You&apos;ll
                receive a notification once your role is confirmed.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Please check back later or contact your Privacy Officer.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
