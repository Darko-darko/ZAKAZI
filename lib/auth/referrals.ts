import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type ReferralAgent = {
  id: string;
  parent_agent_id: string | null;
  ref_code: string;
  role: string;
  top_level_agent_id: string | null;
};

type ReferralRpcClient = SupabaseClient<Database> & {
  rpc(
    fn: "get_referral_agent",
    args: { p_ref_code: string },
  ): Promise<{ data: ReferralAgent[] | null; error: { message: string } | null }>;
};

export async function getReferralAgent(
  supabase: SupabaseClient<Database>,
  refCode: string | null,
) {
  const normalizedRef = refCode?.trim().toUpperCase();

  if (!normalizedRef) {
    return {
      agentId: null,
      parentAgentId: null,
      refCode: null,
      role: null,
      topLevelAgentId: null,
    };
  }

  const { data, error } = await (supabase as ReferralRpcClient).rpc(
    "get_referral_agent",
    { p_ref_code: normalizedRef },
  );

  if (error || !data?.[0]) {
    return {
      agentId: null,
      parentAgentId: null,
      refCode: normalizedRef,
      role: null,
      topLevelAgentId: null,
    };
  }

  return {
    agentId: data[0].id,
    parentAgentId: data[0].parent_agent_id,
    refCode: data[0].ref_code,
    role: data[0].role,
    topLevelAgentId: data[0].top_level_agent_id,
  };
}
