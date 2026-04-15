"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signOut } from "@/app/(auth)/actions";

export default function AwaitingApprovalPage() {
  const router = useRouter();
  const supabase = createClient();
  const [checking, setChecking] = useState(false);

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
        .select("role")
        .eq("id", user.id)
        .single();

      // If role has been assigned, redirect to onboarding
      if (profile?.role) {
        router.push("/onboarding");
      }
    }
    checkStatus();
  }, [supabase, router]);

  async function handleCheckStatus() {
    setChecking(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role) {
      router.push("/onboarding");
    } else {
      setChecking(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Awaiting Approval</h1>
          <p className="mt-2 text-muted-foreground">
            Your account has been created successfully
          </p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              Pending Role Assignment
            </CardTitle>
            <CardDescription>
              Your Privacy Officer needs to review your account and assign you a
              role before you can access the application.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-muted p-4 text-center text-sm text-muted-foreground">
              You&apos;ll be able to proceed once your role has been assigned.
              Check back shortly or contact your Privacy Officer.
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleCheckStatus}
                disabled={checking}
                className="w-full"
              >
                {checking ? "Checking..." : "Check status"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => signOut()}
              >
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
