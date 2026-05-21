import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/brevo";
import {
  hasNotificationEmailList,
  mapNotificationRecipients,
} from "@/lib/email/notification-emails";
import { getPlan } from "@/lib/plans";
import {
  type InvoiceData,
  type InvoicePartyDetails,
  type InvoicePlatformDetails,
  renderInvoicePdf,
} from "./render-pdf";

const PAYMENT_TERM_DAYS = 14;

export type IssueTrialInvoiceResult =
  | { ok: true; invoiceId: string; invoiceNumber: string }
  | { ok: false; reason: string };

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function endOfMonth(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  );
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildInvoiceEmail(params: {
  customerName: string;
  invoiceNumber: string;
  amountLabel: string;
  dueAtLabel: string;
  platformName: string;
}) {
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #0f172a; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h1 style="margin: 0 0 16px; font-size: 22px;">Predracun ${params.invoiceNumber}</h1>
      <p>Postovani,</p>
      <p>
        U prilogu se nalazi predracun broj <strong>${params.invoiceNumber}</strong>
        za korisnicki nalog <strong>${params.customerName}</strong> na platformi ${params.platformName}.
      </p>
      <table style="margin: 16px 0; border-collapse: collapse; width: 100%;">
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Iznos za uplatu</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700;">${params.amountLabel}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Rok placanja</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700;">${params.dueAtLabel}</td>
        </tr>
      </table>
      <p>
        Predracun ce biti vidljiv i u admin panelu na stranici Naplata,
        gde mozete prijaviti uplatu kada je izvrsite.
      </p>
      <p style="margin-top: 24px; color: #64748b; font-size: 13px;">
        Ovaj email je generisan automatski. Ako imate pitanja, odgovorite direktno na ovu poruku.
      </p>
    </div>
  `;
}

const dateLabelFormatter = new Intl.DateTimeFormat("sr-Latn-RS", {
  timeZone: "Europe/Belgrade",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const moneyLabelFormatter = new Intl.NumberFormat("sr-Latn-RS");

export async function issueTrialInvoice(
  providerId: string,
): Promise<IssueTrialInvoiceResult> {
  const admin = createAdminClient();

  const { data: provider, error: providerError } = await admin
    .from("providers")
    .select(
      "id, name, billing_email, plan, plan_status, trial_ends_at, company_name, company_pib, company_mb, company_address, company_city, company_zip",
    )
    .eq("id", providerId)
    .maybeSingle();

  if (providerError || !provider) {
    return { ok: false, reason: "Provider nije pronadjen." };
  }

  if (
    !provider.company_name ||
    !provider.company_pib ||
    !provider.company_mb ||
    !provider.company_address ||
    !provider.company_city ||
    !provider.company_zip ||
    !hasNotificationEmailList(provider.billing_email)
  ) {
    return {
      ok: false,
      reason: "Provider nema kompletne podatke za fakturisanje.",
    };
  }

  const { data: platform, error: platformError } = await admin
    .from("platform_settings")
    .select(
      "company_legal_name, company_pib, company_mb, company_address, company_city, company_zip, bank_name, account_number, iban, is_vat_payer, vat_rate, contact_email, contact_phone",
    )
    .eq("id", 1)
    .maybeSingle();

  if (platformError || !platform) {
    return { ok: false, reason: "Podaci platforme nisu dostupni." };
  }

  if (
    !platform.company_legal_name ||
    !platform.company_pib ||
    !platform.company_mb ||
    !platform.company_address ||
    !platform.company_city ||
    !platform.company_zip
  ) {
    return {
      ok: false,
      reason: "Podaci platforme nisu kompletni. Popuni ih u Super Admin panelu.",
    };
  }

  const planDetails = getPlan(provider.plan);

  if (planDetails.monthlyPriceRsd <= 0) {
    return {
      ok: false,
      reason: `Plan ${provider.plan} nema definisanu cenu — predracun nije moguce izdati.`,
    };
  }

  const now = new Date();
  const periodStart = provider.trial_ends_at
    ? new Date(provider.trial_ends_at)
    : now;
  const periodEnd = endOfMonth(periodStart);
  const dueAt = addDays(periodStart, PAYMENT_TERM_DAYS);

  const { data: createdInvoice, error: insertError } = await admin
    .from("invoices")
    .insert({
      provider_id: provider.id,
      amount: planDetails.monthlyPriceRsd,
      plan: planDetails.id,
      status: "issued",
      issued_at: now.toISOString(),
      due_at: dueAt.toISOString(),
      period_from: toIsoDate(periodStart),
      period_to: toIsoDate(periodEnd),
      number: "",
    })
    .select("id, number")
    .single();

  if (insertError || !createdInvoice) {
    return {
      ok: false,
      reason: `Predracun nije kreiran: ${insertError?.message ?? "nepoznata greska"}`,
    };
  }

  const platformDetails: InvoicePlatformDetails = {
    legalName: platform.company_legal_name,
    pib: platform.company_pib,
    mb: platform.company_mb,
    address: platform.company_address,
    city: platform.company_city,
    zip: platform.company_zip,
    bankName: platform.bank_name,
    accountNumber: platform.account_number,
    iban: platform.iban,
    isVatPayer: platform.is_vat_payer,
    vatRate: Number(platform.vat_rate ?? 20),
    contactEmail: platform.contact_email,
    contactPhone: platform.contact_phone,
  };

  const customerDetails: InvoicePartyDetails = {
    legalName: provider.company_name,
    pib: provider.company_pib,
    mb: provider.company_mb,
    address: provider.company_address,
    city: provider.company_city,
    zip: provider.company_zip,
  };

  const monthLabel = new Intl.DateTimeFormat("sr-Latn-RS", {
    month: "long",
    year: "numeric",
  }).format(periodStart);

  const invoiceData: InvoiceData = {
    number: createdInvoice.number,
    issuedAt: now,
    serviceDate: periodStart,
    dueAt,
    platform: platformDetails,
    customer: customerDetails,
    items: [
      {
        description: `zakazi.pro ${planDetails.label} plan — pretplata za ${monthLabel}`,
        quantity: 1,
        unitPrice: planDetails.monthlyPriceRsd,
      },
    ],
    paymentReference: createdInvoice.number,
  };

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderInvoicePdf(invoiceData);
  } catch (error) {
    return {
      ok: false,
      reason: `Greska pri generisanju PDF-a: ${(error as Error).message}`,
    };
  }

  const storagePath = `invoices/${provider.id}/${createdInvoice.id}.pdf`;
  const { error: uploadError } = await admin.storage
    .from("invoices")
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    return {
      ok: false,
      reason: `Greska pri uploadu PDF-a: ${uploadError.message}`,
    };
  }

  await admin
    .from("invoices")
    .update({ pdf_url: storagePath })
    .eq("id", createdInvoice.id);

  try {
    await sendEmail({
      to: mapNotificationRecipients(provider.billing_email, provider.company_name),
      subject: `Predracun ${createdInvoice.number} — ${platform.company_legal_name}`,
      htmlContent: buildInvoiceEmail({
        customerName: provider.company_name,
        invoiceNumber: createdInvoice.number,
        amountLabel: `${moneyLabelFormatter.format(planDetails.monthlyPriceRsd)} RSD`,
        dueAtLabel: dateLabelFormatter.format(dueAt),
        platformName: platform.company_legal_name,
      }),
      attachments: [
        {
          name: `Predracun-${createdInvoice.number}.pdf`,
          content: pdfBuffer,
        },
      ],
      replyTo: platform.contact_email
        ? { email: platform.contact_email, name: platform.company_legal_name }
        : undefined,
    });
  } catch (error) {
    return {
      ok: false,
      reason: `Predracun je kreiran ali email nije poslat: ${(error as Error).message}`,
    };
  }

  return {
    ok: true,
    invoiceId: createdInvoice.id,
    invoiceNumber: createdInvoice.number,
  };
}
