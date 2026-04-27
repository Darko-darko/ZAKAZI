import "server-only";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdminEmail } from "@/lib/auth/roles";

export async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  if (!isSuperAdminEmail(userData.user.email)) {
    redirect("/admin");
  }

  return {
    user: userData.user,
    admin: createAdminClient(),
  };
}
