"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth/superadmin";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
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
