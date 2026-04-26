import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type ReferralAgent = {
  id: string;
  ref_code: string;
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
    return { agentId: null, refCode: null };
  }

  const { data, error } = await (supabase as ReferralRpcClient).rpc(
    "get_referral_agent",
    { p_ref_code: normalizedRef },
  );

  if (error || !data?.[0]) {
    return { agentId: null, refCode: normalizedRef };
  }

  return { agentId: data[0].id, refCode: data[0].ref_code };
}
