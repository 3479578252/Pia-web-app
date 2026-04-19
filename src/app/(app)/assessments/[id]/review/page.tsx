import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getReviewBundle } from "./actions";
import { ReviewForm } from "./review-form";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await getReviewBundle(id);
  if ("error" in result || !result.bundle) notFound();

  return <ReviewForm bundle={result.bundle} />;
}
