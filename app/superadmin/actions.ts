"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth/superadmin";
import { sendProviderSuspendedEmail } from "@/lib/email/provider-status";
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
    .select("id, provider_id, amount, status, paid_at, payment_method")
    .eq("id", invoiceId)
    .maybeSingle();

  if (!invoice || invoice.paid_at) {
    return;
  }

  const { data: provider } = await admin
    .from("providers")
    .select("id, slug, agent_id, referrer_agent_id, agent_commission_percent")
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
      payment_method: invoice.payment_method ?? "virman",
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
      .limit(1);

    if (!existingCommission?.length) {
      const { data: topAgent } = await admin
        .from("agents")
        .select("id, default_commission_percent")
        .eq("id", provider.agent_id)
        .maybeSingle();

      if (topAgent) {
        const totalPercent =
          provider.agent_commission_percent ?? topAgent.default_commission_percent;
        const commissionRows = [];

        if (
          provider.referrer_agent_id &&
          provider.referrer_agent_id !== provider.agent_id
        ) {
          const { data: commercialist } = await admin
            .from("agents")
            .select("id, default_commission_percent, parent_agent_id, role")
            .eq("id", provider.referrer_agent_id)
            .maybeSingle();

          if (
            commercialist &&
            commercialist.role === "commercialist" &&
            commercialist.parent_agent_id === provider.agent_id
          ) {
            const commercialistPercent = Math.min(
              commercialist.default_commission_percent,
              totalPercent,
            );
            const agentPercent = Math.max(0, totalPercent - commercialistPercent);

            if (commercialistPercent > 0) {
              commissionRows.push({
                agent_id: commercialist.id,
                invoice_id: invoice.id,
                provider_id: provider.id,
                percent: commercialistPercent,
                amount: Math.round((invoice.amount * commercialistPercent) / 100),
                status: "pending",
              });
            }

            if (agentPercent > 0) {
              commissionRows.push({
                agent_id: topAgent.id,
                invoice_id: invoice.id,
                provider_id: provider.id,
                percent: agentPercent,
                amount: Math.round((invoice.amount * agentPercent) / 100),
                status: "pending",
              });
            }
          }
        }

        if (commissionRows.length === 0 && totalPercent > 0) {
          commissionRows.push({
            agent_id: topAgent.id,
            invoice_id: invoice.id,
            provider_id: provider.id,
            percent: totalPercent,
            amount: Math.round((invoice.amount * totalPercent) / 100),
            status: "pending",
          });
        }

        if (commissionRows.length > 0) {
          await admin.from("agent_commissions").insert(commissionRows);
        }
      }
    }
  }

  revalidatePath("/superadmin");
  revalidatePath("/superadmin/agenti");
  revalidatePath("/admin/naplata");
  revalidatePath("/admin");
  revalidatePath(`/${provider.slug}`);
}

export async function suspendProviderAction(formData: FormData) {
  const providerId = readString(formData, "provider_id");

  if (!providerId) {
    redirect("/superadmin?error=missing-provider");
  }

  const { admin } = await requireSuperAdmin();
  const { data: provider } = await admin
    .from("providers")
    .select("id, slug, name, billing_email, plan_status")
    .eq("id", providerId)
    .maybeSingle();

  if (!provider) {
    redirect("/superadmin?error=missing-provider");
  }

  if (provider.plan_status === "cancelled") {
    redirect("/superadmin?error=provider-status-change-failed");
  }

  const { error } = await admin
    .from("providers")
    .update({ plan_status: "suspended" })
    .eq("id", provider.id);

  if (error) {
    redirect("/superadmin?error=provider-status-change-failed");
  }

  let suspendNotice = "provider-suspended";

  if (provider.billing_email) {
    try {
      await sendProviderSuspendedEmail({
        to: provider.billing_email,
        providerName: provider.name,
        providerSlug: provider.slug,
      });
      suspendNotice = "provider-suspended-email-sent";
    } catch (emailError) {
      console.error("Suspended provider email nije poslat.", {
        providerId: provider.id,
        error: emailError,
      });
      suspendNotice = "provider-suspended-email-failed";
    }
  }

  revalidatePath("/superadmin");
  revalidatePath("/admin");
  revalidatePath(`/${provider.slug}`);
  redirect(`/superadmin?notice=${suspendNotice}`);
}

export async function activateProviderAction(formData: FormData) {
  const providerId = readString(formData, "provider_id");

  if (!providerId) {
    redirect("/superadmin?error=missing-provider");
  }

  const { admin } = await requireSuperAdmin();
  const { data: provider } = await admin
    .from("providers")
    .select("id, slug")
    .eq("id", providerId)
    .maybeSingle();

  if (!provider) {
    redirect("/superadmin?error=missing-provider");
  }

  const { error } = await admin
    .from("providers")
    .update({ plan_status: "active" })
    .eq("id", provider.id);

  if (error) {
    redirect("/superadmin?error=provider-status-change-failed");
  }

  revalidatePath("/superadmin");
  revalidatePath("/admin");
  revalidatePath(`/${provider.slug}`);
  redirect("/superadmin?notice=provider-activated");
}
