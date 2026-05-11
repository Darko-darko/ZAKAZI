import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getAgentForUser } from "@/lib/auth/agent-compat";

export type AgentRole = "agent" | "commercialist";

export function normalizeAgentRole(role: string | null | undefined): AgentRole {
  return role === "commercialist" ? "commercialist" : "agent";
}

export function getSuperAdminEmails() {
  return (process.env.SUPER_ADMIN_EMAILS ?? "admin@zakazi.pro")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdminEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  return getSuperAdminEmails().includes(email.toLowerCase());
}

export async function getPostLoginRedirect(
  supabase: SupabaseClient<Database>,
  user: User,
) {
  const { data: provider } = await supabase
    .from("providers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (provider) {
    return "/admin";
  }

  const { data: agent } = await getAgentForUser(supabase, user.id);

  if (agent?.is_active && !agent.archived_at) {
    return normalizeAgentRole(agent.role) === "commercialist"
      ? "/komercijalista"
      : "/agent";
  }

  if (isSuperAdminEmail(user.email)) {
    return "/superadmin";
  }

  return "/register/onboarding";
}
