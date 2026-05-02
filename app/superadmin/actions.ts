"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth/superadmin";
import { issueTrialInvoice } from "@/lib/invoices/issue-trial-invoice";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readNullableString(formData: FormData, key: string) {
  const value = readString(formData, key);
  return value || null;
}

function readBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function readVatRate(formData: FormData) {
  const value = Number.parseFloat(readString(formData, "vat_rate"));

  if (Number.isNaN(value)) {
    return 20;
  }

  return Math.min(100, Math.max(0, value));
}

const pibPattern = /^\d{9}$/;
const mbPattern = /^\d{8}$/;

export async function updatePlatformSettingsAction(formData: FormData) {
  const { admin } = await requireSuperAdmin();

  const companyPib = readNullableString(formData, "company_pib");
  const companyMb = readNullableString(formData, "company_mb");

  if (companyPib && !pibPattern.test(companyPib)) {
    redirect("/superadmin?error=invalid-pib");
  }

  if (companyMb && !mbPattern.test(companyMb)) {
    redirect("/superadmin?error=invalid-mb");
  }

  const update = {
    company_legal_name: readNullableString(formData, "company_legal_name"),
    company_pib: companyPib,
    company_mb: companyMb,
    company_address: readNullableString(formData, "company_address"),
    company_city: readNullableString(formData, "company_city"),
    company_zip: readNullableString(formData, "company_zip"),
    bank_name: readNullableString(formData, "bank_name"),
    account_number: readNullableString(formData, "account_number"),
    iban: readNullableString(formData, "iban"),
    is_vat_payer: readBoolean(formData, "is_vat_payer"),
    vat_rate: readVatRate(formData),
    contact_email: readNullableString(formData, "contact_email"),
    contact_phone: readNullableString(formData, "contact_phone"),
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin
    .from("platform_settings")
    .update(update)
    .eq("id", 1);

  if (error) {
    redirect("/superadmin?error=platform-save-failed");
  }

  revalidatePath("/superadmin");
  redirect("/superadmin?notice=platform-saved");
}

export async function issueTestInvoiceAction(formData: FormData) {
  await requireSuperAdmin();
  const providerId = readString(formData, "provider_id");

  if (!providerId) {
    redirect("/superadmin?error=missing-provider");
  }

  const result = await issueTrialInvoice(providerId);

  if (!result.ok) {
    const reason = encodeURIComponent(result.reason);
    redirect(`/superadmin?error=invoice-failed&reason=${reason}`);
  }

  revalidatePath("/superadmin");
  revalidatePath("/admin/naplata");
  redirect(`/superadmin?notice=invoice-issued&number=${result.invoiceNumber}`);
}

export async function confirmInvoicePaymentAction(formData: FormData) {
  const invoiceId = readString(formData, "invoice_id");

  if (!invoiceId) {
    return;
  }

  const { admin } = await requireSuperAdmin();

  const { data: invoice } = await admin
    .from("invoices")
    .select("id, provider_id, amount, status, paid_at")
    .eq("id", invoiceId)
    .maybeSingle();

  if (!invoice || invoice.paid_at) {
    return;
  }

  const { data: provider } = await admin
    .from("providers")
    .select("id, slug, agent_id, agent_commission_percent")
    .eq("id", invoice.provider_id)
    .maybeSingle();

  if (!provider) {
    return;
  }

  await admin
    .from("invoices")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      payment_method: "virman",
    })
    .eq("id", invoice.id);

  await admin
    .from("providers")
    .update({ plan_status: "active" })
    .eq("id", provider.id);

  if (provider.agent_id && typeof invoice.amount === "number") {
    const { data: existingCommission } = await admin
      .from("agent_commissions")
      .select("id")
      .eq("invoice_id", invoice.id)
      .maybeSingle();

    if (!existingCommission) {
      const { data: agent } = await admin
        .from("agents")
        .select("id, default_commission_percent")
        .eq("id", provider.agent_id)
        .maybeSingle();

      if (agent) {
        const percent =
          provider.agent_commission_percent ?? agent.default_commission_percent;
        const amount = Math.round((invoice.amount * percent) / 100);

        await admin.from("agent_commissions").insert({
          agent_id: agent.id,
          invoice_id: invoice.id,
          provider_id: provider.id,
          percent,
          amount,
          status: "pending",
        });
      }
    }
  }

  revalidatePath("/superadmin");
  revalidatePath("/superadmin/agenti");
  revalidatePath("/admin/naplata");
  revalidatePath("/admin");
  revalidatePath(`/${provider.slug}`);
}
