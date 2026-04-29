"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProvider } from "@/lib/admin/provider";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function claimInvoicePaymentAction(formData: FormData) {
  const { supabase } = await getCurrentProvider();
  const paymentClaimToken = readString(formData, "payment_claim_token");

  if (!paymentClaimToken) {
    redirect("/admin/naplata?error=missing-token");
  }

  const { data, error } = await supabase.rpc("claim_invoice_payment", {
    p_payment_claim_token: paymentClaimToken,
    p_payment_proof_url: undefined,
  });

  if (error || !data) {
    redirect("/admin/naplata?error=claim-failed");
  }

  revalidatePath("/admin/naplata");
  redirect("/admin/naplata?notice=payment-claimed");
}
