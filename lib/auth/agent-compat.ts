import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type AgentRow = Database["public"]["Tables"]["agents"]["Row"];
type AgentCompatRow = Omit<AgentRow, "role" | "parent_agent_id" | "archived_at"> & {
  role: string | null;
  parent_agent_id: string | null;
  archived_at: string | null;
};

type ProviderRow = Database["public"]["Tables"]["providers"]["Row"];
type LegacyProviderListRow = Pick<ProviderRow, "id" | "agent_id">;
type ProviderCompatRow = LegacyProviderListRow & { referrer_agent_id: string | null };

function hasMissingColumnError(message: string | undefined, column: string) {
  if (!message) {
    return false;
  }

  const normalized = message.toLowerCase();
  return normalized.includes(`column`) && normalized.includes(column.toLowerCase());
}

function isLegacyAgentSchemaError(message: string | undefined) {
  return (
    hasMissingColumnError(message, "role") ||
    hasMissingColumnError(message, "parent_agent_id") ||
    hasMissingColumnError(message, "archived_at")
  );
}

function isLegacyProviderSchemaError(message: string | undefined) {
  return hasMissingColumnError(message, "referrer_agent_id");
}

function normalizeLegacyAgentRow(
  row: Omit<AgentRow, "role" | "parent_agent_id" | "archived_at">,
): AgentCompatRow {
  return {
    ...row,
    role: "agent",
    parent_agent_id: null,
    archived_at: null,
  };
}

function normalizeLegacyProviderRow(row: LegacyProviderListRow): ProviderCompatRow {
  return {
    ...row,
    referrer_agent_id: row.agent_id ?? null,
  };
}

export async function getAgentForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const nextQuery = await supabase
    .from("agents")
    .select(
      "id, user_id, name, email, phone, ref_code, default_commission_percent, is_active, created_at, role, parent_agent_id, archived_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (!nextQuery.error) {
    return nextQuery;
  }

  if (!isLegacyAgentSchemaError(nextQuery.error.message)) {
    return nextQuery;
  }

  const legacyQuery = await supabase
    .from("agents")
    .select(
      "id, user_id, name, email, phone, ref_code, default_commission_percent, is_active, created_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  return {
    data: legacyQuery.data ? normalizeLegacyAgentRow(legacyQuery.data) : null,
    error: legacyQuery.error,
  };
}

export async function listAgentsForAdmin(admin: SupabaseClient<Database>) {
  const nextQuery = await admin
    .from("agents")
    .select(
      "id, user_id, name, email, phone, ref_code, default_commission_percent, is_active, created_at, role, parent_agent_id, archived_at",
    )
    .order("created_at", { ascending: false });

  if (!nextQuery.error) {
    return nextQuery;
  }

  if (!isLegacyAgentSchemaError(nextQuery.error.message)) {
    return nextQuery;
  }

  const legacyQuery = await admin
    .from("agents")
    .select(
      "id, user_id, name, email, phone, ref_code, default_commission_percent, is_active, created_at",
    )
    .order("created_at", { ascending: false });

  return {
    data: legacyQuery.data?.map(normalizeLegacyAgentRow) ?? null,
    error: legacyQuery.error,
  };
}

export async function listProvidersForAdmin(admin: SupabaseClient<Database>) {
  const nextQuery = await admin
    .from("providers")
    .select("id, agent_id, referrer_agent_id")
    .order("created_at", { ascending: false });

  if (!nextQuery.error) {
    return nextQuery;
  }

  if (!isLegacyProviderSchemaError(nextQuery.error.message)) {
    return nextQuery;
  }

  const legacyQuery = await admin
    .from("providers")
    .select("id, agent_id")
    .order("created_at", { ascending: false });

  return {
    data: legacyQuery.data?.map(normalizeLegacyProviderRow) ?? null,
    error: legacyQuery.error,
  };
}
