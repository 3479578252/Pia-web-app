import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TeamClient } from "./team-client";
import type { Profile } from "@/types/database";

export default async function TeamPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  const members = (data || []) as Profile[];

  return <TeamClient members={members} currentUserId={user.id} />;
}
