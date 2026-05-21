"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProvider } from "@/lib/admin/provider";
import {
  formatNotificationEmails,
  invalidNotificationEmails,
} from "@/lib/email/notification-emails";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readNullableString(formData: FormData, key: string) {
  const value = readString(formData, key);
  return value || null;
}

const pibPattern = /^\d{9}$/;
const mbPattern = /^\d{8}$/;

export async function updateBillingDetailsAction(formData: FormData) {
  const { supabase, provider } = await getCurrentProvider();

  const companyName = readNullableString(formData, "company_name");
  const companyPib = readNullableString(formData, "company_pib");
  const companyMb = readNullableString(formData, "company_mb");

  if (companyPib && !pibPattern.test(companyPib)) {
    redirect("/admin/naplata?error=invalid-pib");
  }

  if (companyMb && !mbPattern.test(companyMb)) {
    redirect("/admin/naplata?error=invalid-mb");
  }

  const billingEmailRaw = readNullableString(formData, "billing_email");
  const invalidEmails = invalidNotificationEmails(billingEmailRaw);

  if (invalidEmails.length > 0) {
    redirect("/admin/naplata?error=invalid-billing-email");
  }

  const update = {
    company_name: companyName,
    company_pib: companyPib,
    company_mb: companyMb,
    company_address: readNullableString(formData, "company_address"),
    company_city: readNullableString(formData, "company_city"),
    company_zip: readNullableString(formData, "company_zip"),
    billing_email: formatNotificationEmails(billingEmailRaw),
  };

  const { error } = await supabase
    .from("providers")
    .update(update)
    .eq("id", provider.id)
    .eq("user_id", provider.user_id);

  if (error) {
    redirect("/admin/naplata?error=billing-save-failed");
  }

  revalidatePath("/admin/naplata");
  redirect("/admin/naplata?notice=billing-saved");
}

export async function claimInvoicePaymentAction(formData: FormData) {
  const { supabase } = await getCurrentProvider();
  const paymentClaimToken = readString(formData, "payment_claim_token");
  const paymentMethodRaw = readString(formData, "payment_method");
  const paymentMethod = paymentMethodRaw === "cash" ? "cash" : "virman";

  if (!paymentClaimToken) {
    redirect("/admin/naplata?error=missing-token");
  }

  const { data, error } = await supabase.rpc("claim_invoice_payment", {
    p_payment_claim_token: paymentClaimToken,
    p_payment_method: paymentMethod,
    p_payment_proof_url: undefined,
  });

  if (error || !data) {
    redirect("/admin/naplata?error=claim-failed");
  }

  revalidatePath("/admin/naplata");
  redirect("/admin/naplata?notice=payment-claimed");
}
