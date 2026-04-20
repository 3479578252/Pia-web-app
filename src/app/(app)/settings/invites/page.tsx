import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InvitesClient } from "./invites-client";
import type { Invite } from "@/types/database";

export default async function InvitesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("invites")
    .select("*")
    .order("created_at", { ascending: false });

  const invites = (data || []) as Invite[];

  return <InvitesClient invites={invites} />;
}
