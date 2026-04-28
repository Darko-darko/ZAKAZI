import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentProvider() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data: provider } = await supabase
    .from("providers")
    .select(
      "id, user_id, name, slug, city, plan, plan_status, trial_ends_at, plan_expires_at",
    )
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!provider) {
    redirect("/register/onboarding");
  }

  return { supabase, provider, user: userData.user };
}
