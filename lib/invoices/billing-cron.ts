import "server-only";

import { sendEmail } from "@/lib/email/brevo";
import { getPlan } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  type InvoiceData,
  type InvoicePartyDetails,
  type InvoicePlatformDetails,
  renderInvoicePdf,
} from "./render-pdf";

const PAYMENT_TERM_DAYS = 14;
const DUE_REMINDER_MARKER = "[billing:due-reminder]";
const OVERDUE_WARNING_MARKER = "[billing:overdue-warning]";

type ProviderBillingRow = {
  id: string;
  name: string;
  slug: string;
  billing_email: string | null;
  plan: string;
  plan_status: string;
  trial_ends_at: string | null;
  plan_expires_at: string | null;
  company_name: string | null;
  company_pib: string | null;
  company_mb: string | null;
  company_address: string | null;
  company_city: string | null;
  company_zip: string | null;
};

type PlatformSettingsRow = {
  company_legal_name: string | null;
  company_pib: string | null;
  company_mb: string | null;
  company_address: string | null;
  company_city: string | null;
  company_zip: string | null;
  bank_name: string | null;
  account_number: string | null;
  iban: string | null;
  is_vat_payer: boolean | null;
  vat_rate: number | string | null;
  contact_email: string | null;
  contact_phone: string | null;
};

type InvoiceRow = {
  id: string;
  provider_id: string;
  number: string;
  amount: number | null;
  plan: string | null;
  status: string;
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  payment_claimed_at: string | null;
  pdf_url: string | null;
  period_from: string | null;
  period_to: string | null;
  notes: string | null;
  created_at: string;
};

type InvoiceContext = {
  invoice: InvoiceRow;
  provider: ProviderBillingRow;
  platform: PlatformSettingsRow;
  planDetails: ReturnType<typeof getPlan>;
  periodStart: Date;
  dueAt: Date;
};

export type CronInvoiceRunResult = {
  checked: number;
  created: number;
  sent: number;
  reminded: number;
  overdueMarked: number;
  planPastDue: number;
  suspended: number;
  skipped: number;
  failed: number;
  errors: string[];
};

function createRunResult(): CronInvoiceRunResult {
  return {
    checked: 0,
    created: 0,
    sent: 0,
    reminded: 0,
    overdueMarked: 0,
    planPastDue: 0,
    suspended: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function stripTime(value: Date) {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

function diffCalendarDays(from: Date, to: Date) {
  return Math.round((stripTime(to) - stripTime(from)) / (24 * 60 * 60 * 1000));
}

function appendMarker(notes: string | null, marker: string) {
  const current = notes?.trim() ?? "";

  if (current.includes(marker)) {
    return current;
  }

  return current ? `${current}\n${marker}` : marker;
}

function hasBillingDetails(provider: ProviderBillingRow) {
  return Boolean(
    provider.company_name &&
      provider.company_pib &&
      provider.company_mb &&
      provider.company_address &&
      provider.company_city &&
      provider.company_zip &&
      provider.billing_email,
  );
}

function hasPlatformDetails(platform: PlatformSettingsRow | null) {
  return Boolean(
    platform?.company_legal_name &&
      platform.company_pib &&
      platform.company_mb &&
      platform.company_address &&
      platform.company_city &&
      platform.company_zip,
  );
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
      <h1 style="margin: 0 0 16px; font-size: 22px;">Faktura ${params.invoiceNumber}</h1>
      <p>Postovani,</p>
      <p>
        U prilogu se nalazi faktura broj <strong>${params.invoiceNumber}</strong>
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
        Faktura ce biti vidljiva i u admin panelu na stranici Naplata,
        gde mozete prijaviti uplatu kada je izvrsite.
      </p>
      <p style="margin-top: 24px; color: #64748b; font-size: 13px;">
        Ovaj email je generisan automatski. Ako imate pitanja, odgovorite direktno na ovu poruku.
      </p>
    </div>
  `;
}

function buildBillingReminderEmail(params: {
  providerName: string;
  invoiceNumber: string;
  amountLabel: string;
  dueAtLabel: string;
  daysLeft: number;
}) {
  const dayLabel = params.daysLeft === 1 ? "1 dan" : `${params.daysLeft} dana`;

  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #0f172a; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h1 style="margin: 0 0 16px; font-size: 22px;">Podsetnik za fakturu ${params.invoiceNumber}</h1>
      <p>Postovani,</p>
      <p>
        Podsecamo vas da faktura za nalog <strong>${params.providerName}</strong>
        dospeva za <strong>${dayLabel}</strong>.
      </p>
      <table style="margin: 16px 0; border-collapse: collapse; width: 100%;">
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Faktura</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700;">${params.invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Iznos</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700;">${params.amountLabel}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Rok placanja</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700;">${params.dueAtLabel}</td>
        </tr>
      </table>
      <p>
        Ako ste uplatu vec izvrsili, mozete je prijaviti iz admin panela u sekciji Naplata.
      </p>
    </div>
  `;
}

function buildOverdueEmail(params: {
  providerName: string;
  invoiceNumber: string;
  amountLabel: string;
  dueAtLabel: string;
}) {
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #0f172a; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h1 style="margin: 0 0 16px; font-size: 22px;">Faktura ${params.invoiceNumber} kasni</h1>
      <p>Postovani,</p>
      <p>
        Faktura za nalog <strong>${params.providerName}</strong> nije placena do roka i sada je oznacena kao kasnjenje.
      </p>
      <table style="margin: 16px 0; border-collapse: collapse; width: 100%;">
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Faktura</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700;">${params.invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Iznos</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700;">${params.amountLabel}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Rok placanja</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700;">${params.dueAtLabel}</td>
        </tr>
      </table>
      <p>
        Booking i dalje radi, ali vas molimo da uplatu izmirite sto pre kako bi nalog ostao bez prekida.
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

async function getPlatformSettings() {
  const admin = createAdminClient();
  const { data: platform, error } = await admin
    .from("platform_settings")
    .select(
      "company_legal_name, company_pib, company_mb, company_address, company_city, company_zip, bank_name, account_number, iban, is_vat_payer, vat_rate, contact_email, contact_phone",
    )
    .eq("id", 1)
    .maybeSingle();

  if (error || !platform) {
    throw new Error("Podaci platforme nisu dostupni.");
  }

  if (!hasPlatformDetails(platform)) {
    throw new Error("Podaci platforme nisu kompletni.");
  }

  return platform as PlatformSettingsRow;
}

async function getProviderBillingRow(providerId: string) {
  const admin = createAdminClient();
  const { data: provider, error } = await admin
    .from("providers")
    .select(
      "id, name, slug, billing_email, plan, plan_status, trial_ends_at, plan_expires_at, company_name, company_pib, company_mb, company_address, company_city, company_zip",
    )
    .eq("id", providerId)
    .maybeSingle();

  if (error || !provider) {
    throw new Error("Provider nije pronadjen.");
  }

  return provider as ProviderBillingRow;
}

async function getInvoiceContext(invoiceId: string): Promise<InvoiceContext> {
  const admin = createAdminClient();
  const [{ data: invoice, error: invoiceError }, platform] = await Promise.all([
    admin
      .from("invoices")
      .select(
        "id, provider_id, number, amount, plan, status, issued_at, due_at, paid_at, payment_claimed_at, pdf_url, period_from, period_to, notes, created_at",
      )
      .eq("id", invoiceId)
      .maybeSingle(),
    getPlatformSettings(),
  ]);

  if (invoiceError || !invoice) {
    throw new Error("Faktura nije pronadjena.");
  }

  const provider = await getProviderBillingRow(invoice.provider_id);

  if (!hasBillingDetails(provider)) {
    throw new Error("Provider nema kompletne podatke za fakturisanje.");
  }

  const planDetails = getPlan(invoice.plan ?? provider.plan);
  const periodStart = invoice.period_from
    ? new Date(`${invoice.period_from}T00:00:00.000Z`)
    : invoice.issued_at
      ? new Date(invoice.issued_at)
      : new Date(invoice.created_at);
  const dueAt = invoice.due_at ? new Date(invoice.due_at) : addDays(periodStart, PAYMENT_TERM_DAYS);

  return {
    invoice: invoice as InvoiceRow,
    provider,
    platform,
    planDetails,
    periodStart,
    dueAt,
  };
}

function buildInvoiceData(context: InvoiceContext): InvoiceData {
  const platformDetails: InvoicePlatformDetails = {
    legalName: context.platform.company_legal_name ?? "zakazi.pro",
    pib: context.platform.company_pib ?? "",
    mb: context.platform.company_mb ?? "",
    address: context.platform.company_address ?? "",
    city: context.platform.company_city ?? "",
    zip: context.platform.company_zip ?? "",
    bankName: context.platform.bank_name,
    accountNumber: context.platform.account_number,
    iban: context.platform.iban,
    isVatPayer: Boolean(context.platform.is_vat_payer),
    vatRate: Number(context.platform.vat_rate ?? 20),
    contactEmail: context.platform.contact_email,
    contactPhone: context.platform.contact_phone,
  };

  const customerDetails: InvoicePartyDetails = {
    legalName: context.provider.company_name ?? context.provider.name,
    pib: context.provider.company_pib ?? "",
    mb: context.provider.company_mb ?? "",
    address: context.provider.company_address ?? "",
    city: context.provider.company_city ?? "",
    zip: context.provider.company_zip ?? "",
  };

  const monthLabel = new Intl.DateTimeFormat("sr-Latn-RS", {
    month: "long",
    year: "numeric",
  }).format(context.periodStart);

  return {
    number: context.invoice.number,
    issuedAt: context.invoice.issued_at
      ? new Date(context.invoice.issued_at)
      : new Date(context.invoice.created_at),
    serviceDate: context.periodStart,
    dueAt: context.dueAt,
    platform: platformDetails,
    customer: customerDetails,
    items: [
      {
        description: `zakazi.pro ${context.planDetails.label} plan - pretplata za ${monthLabel}`,
        quantity: 1,
        unitPrice: context.invoice.amount ?? context.planDetails.monthlyPriceRsd,
      },
    ],
    paymentReference: context.invoice.number,
  };
}

async function markInvoiceWithNote(invoice: InvoiceRow, marker: string) {
  const admin = createAdminClient();
  const nextNotes = appendMarker(invoice.notes, marker);

  if (nextNotes === (invoice.notes ?? "")) {
    return;
  }

  const { error } = await admin
    .from("invoices")
    .update({ notes: nextNotes })
    .eq("id", invoice.id);

  if (error) {
    throw new Error(`Azuriranje fakture ${invoice.number} nije uspelo: ${error.message}`);
  }

  invoice.notes = nextNotes;
}

async function sendSimpleBillingEmail(params: {
  to: string;
  subject: string;
  htmlContent: string;
  replyTo?: { email: string; name?: string };
}) {
  await sendEmail({
    to: [{ email: params.to }],
    subject: params.subject,
    htmlContent: params.htmlContent,
    replyTo: params.replyTo,
  });
}

async function sendInvoiceById(invoiceId: string) {
  const admin = createAdminClient();
  const context = await getInvoiceContext(invoiceId);

  if (context.invoice.pdf_url) {
    return { skipped: true as const };
  }

  const invoiceData = buildInvoiceData(context);
  const pdfBuffer = await renderInvoicePdf(invoiceData);
  const storagePath = `invoices/${context.provider.id}/${context.invoice.id}.pdf`;

  const { error: uploadError } = await admin.storage
    .from("invoices")
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Greska pri uploadu PDF-a: ${uploadError.message}`);
  }

  const { error: updateError } = await admin
    .from("invoices")
    .update({ pdf_url: storagePath })
    .eq("id", context.invoice.id);

  if (updateError) {
    throw new Error(`Cuvanje putanje PDF-a nije uspelo: ${updateError.message}`);
  }

  await sendEmail({
    to: [
      {
        email: context.provider.billing_email ?? "",
        name: context.provider.company_name ?? context.provider.name,
      },
    ],
    subject: `Faktura ${context.invoice.number} - ${context.platform.company_legal_name}`,
    htmlContent: buildInvoiceEmail({
      customerName: context.provider.company_name ?? context.provider.name,
      invoiceNumber: context.invoice.number,
      amountLabel: `${moneyLabelFormatter.format(context.invoice.amount ?? 0)} RSD`,
      dueAtLabel: dateLabelFormatter.format(context.dueAt),
      platformName: context.platform.company_legal_name ?? "zakazi.pro",
    }),
    attachments: [
      {
        name: `Faktura-${context.invoice.number}.pdf`,
        content: pdfBuffer,
      },
    ],
    replyTo: context.platform.contact_email
      ? {
          email: context.platform.contact_email,
          name: context.platform.company_legal_name ?? "zakazi.pro",
        }
      : undefined,
  });

  return { skipped: false as const };
}

async function createInvoiceForPeriod(provider: ProviderBillingRow, periodStart: Date) {
  const admin = createAdminClient();
  const platform = await getPlatformSettings();
  const issuedAt = new Date();

  if (!hasBillingDetails(provider)) {
    throw new Error(
      `Provider ${provider.name} nema kompletne podatke za fakturisanje.`,
    );
  }

  if (!hasPlatformDetails(platform)) {
    throw new Error("Podaci platforme nisu kompletni.");
  }

  const planDetails = getPlan(provider.plan);
  if (planDetails.monthlyPriceRsd <= 0) {
    throw new Error(`Plan ${provider.plan} nema definisanu cenu.`);
  }

  const periodEnd = endOfMonth(periodStart);
  const periodFrom = toIsoDate(periodStart);
  const periodTo = toIsoDate(periodEnd);

  const { data: existingInvoice, error: existingError } = await admin
    .from("invoices")
    .select("id")
    .eq("provider_id", provider.id)
    .eq("period_from", periodFrom)
    .eq("period_to", periodTo)
    .neq("status", "cancelled")
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Provera postojece fakture za ${provider.name} nije uspela: ${existingError.message}`,
    );
  }

  if (existingInvoice) {
    return { created: false as const };
  }

  const dueAt = addDays(issuedAt, PAYMENT_TERM_DAYS);
  const { data: createdInvoice, error: insertError } = await admin
    .from("invoices")
    .insert({
      provider_id: provider.id,
      amount: planDetails.monthlyPriceRsd,
      plan: planDetails.id,
      status: "issued",
      issued_at: issuedAt.toISOString(),
      due_at: dueAt.toISOString(),
      period_from: periodFrom,
      period_to: periodTo,
      number: "",
    })
    .select("id, number")
    .single();

  if (insertError || !createdInvoice) {
    throw new Error(
      `Kreiranje fakture za ${provider.name} nije uspelo: ${insertError?.message ?? "nepoznata greska"}`,
    );
  }

  return {
    created: true as const,
    invoiceId: createdInvoice.id,
    invoiceNumber: createdInvoice.number,
  };
}

export async function createMonthlyInvoices() {
  const admin = createAdminClient();
  const result = createRunResult();
  const now = new Date();
  const currentPeriodStart = startOfMonth(now);

  const { data: providers, error } = await admin
    .from("providers")
    .select(
      "id, name, slug, billing_email, plan, plan_status, trial_ends_at, plan_expires_at, company_name, company_pib, company_mb, company_address, company_city, company_zip",
    )
    .in("plan", ["basic", "pro"])
    .in("plan_status", ["trial", "active", "past_due"]);

  if (error) {
    throw new Error(`Ucitavanje billing providera nije uspelo: ${error.message}`);
  }

  for (const provider of (providers ?? []) as ProviderBillingRow[]) {
    result.checked += 1;

    try {
      const isTrialStillActive =
        provider.plan_status === "trial" &&
        provider.trial_ends_at &&
        new Date(provider.trial_ends_at).getTime() > now.getTime();

      if (isTrialStillActive) {
        result.skipped += 1;
        continue;
      }

      const { data: openInvoice, error: openInvoiceError } = await admin
        .from("invoices")
        .select("id")
        .eq("provider_id", provider.id)
        .in("status", ["issued", "overdue"])
        .is("paid_at", null)
        .limit(1)
        .maybeSingle();

      if (openInvoiceError) {
        throw new Error(openInvoiceError.message);
      }

      if (openInvoice) {
        result.skipped += 1;
        continue;
      }

      const created = await createInvoiceForPeriod(provider, currentPeriodStart);
      if (created.created) {
        result.created += 1;
      } else {
        result.skipped += 1;
      }
    } catch (error) {
      result.failed += 1;
      result.errors.push(
        `${provider.name}: ${(error as Error).message}`,
      );
    }
  }

  return result;
}

export async function sendPendingInvoices() {
  const admin = createAdminClient();
  const result = createRunResult();

  const { data: invoices, error } = await admin
    .from("invoices")
    .select(
      "id, provider_id, number, amount, plan, status, issued_at, due_at, paid_at, payment_claimed_at, pdf_url, period_from, period_to, notes, created_at",
    )
    .eq("status", "issued")
    .is("paid_at", null)
    .is("pdf_url", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Ucitavanje faktura za slanje nije uspelo: ${error.message}`);
  }

  for (const invoice of (invoices ?? []) as InvoiceRow[]) {
    result.checked += 1;

    try {
      const response = await sendInvoiceById(invoice.id);
      if (response.skipped) {
        result.skipped += 1;
      } else {
        result.sent += 1;
      }
    } catch (error) {
      result.failed += 1;
      result.errors.push(
        `${invoice.number}: ${(error as Error).message}`,
      );
    }
  }

  return result;
}

export async function runBillingCheck() {
  const admin = createAdminClient();
  const result = createRunResult();
  const now = new Date();

  const { data: invoices, error } = await admin
    .from("invoices")
    .select(
      "id, provider_id, number, amount, plan, status, issued_at, due_at, paid_at, payment_claimed_at, pdf_url, period_from, period_to, notes, created_at",
    )
    .in("status", ["issued", "overdue"])
    .is("paid_at", null);

  if (error) {
    throw new Error(`Ucitavanje faktura za billing proveru nije uspelo: ${error.message}`);
  }

  for (const invoice of (invoices ?? []) as InvoiceRow[]) {
    result.checked += 1;

    try {
      const provider = await getProviderBillingRow(invoice.provider_id);

      if (!invoice.due_at) {
        result.skipped += 1;
        continue;
      }

      const dueAt = new Date(invoice.due_at);
      let effectiveStatus = invoice.status;

      if (effectiveStatus === "issued" && dueAt.getTime() < now.getTime()) {
        const { error: markOverdueError } = await admin
          .from("invoices")
          .update({ status: "overdue" })
          .eq("id", invoice.id)
          .eq("status", "issued");

        if (markOverdueError) {
          throw new Error(markOverdueError.message);
        }

        effectiveStatus = "overdue";
        result.overdueMarked += 1;

        if (
          provider.billing_email &&
          !invoice.notes?.includes(OVERDUE_WARNING_MARKER)
        ) {
          await sendSimpleBillingEmail({
            to: provider.billing_email,
            subject: `Faktura ${invoice.number} kasni`,
            htmlContent: buildOverdueEmail({
              providerName: provider.company_name ?? provider.name,
              invoiceNumber: invoice.number,
              amountLabel: `${moneyLabelFormatter.format(invoice.amount ?? 0)} RSD`,
              dueAtLabel: dateLabelFormatter.format(dueAt),
            }),
          });
          await markInvoiceWithNote(invoice, OVERDUE_WARNING_MARKER);
        }
      }

      const daysUntilDue = diffCalendarDays(now, dueAt);
      if (
        effectiveStatus === "issued" &&
        daysUntilDue === 3 &&
        provider.billing_email &&
        !invoice.notes?.includes(DUE_REMINDER_MARKER)
      ) {
        await sendSimpleBillingEmail({
          to: provider.billing_email,
          subject: `Podsetnik za fakturu ${invoice.number}`,
          htmlContent: buildBillingReminderEmail({
            providerName: provider.company_name ?? provider.name,
            invoiceNumber: invoice.number,
            amountLabel: `${moneyLabelFormatter.format(invoice.amount ?? 0)} RSD`,
            dueAtLabel: dateLabelFormatter.format(dueAt),
            daysLeft: 3,
          }),
        });
        await markInvoiceWithNote(invoice, DUE_REMINDER_MARKER);
        result.reminded += 1;
      }

      if (effectiveStatus !== "overdue") {
        continue;
      }

      const overdueDays = diffCalendarDays(dueAt, now);

      if (
        overdueDays >= 7 &&
        provider.plan_status !== "past_due" &&
        provider.plan_status !== "suspended" &&
        provider.plan_status !== "cancelled"
      ) {
        const { error: pastDueError } = await admin
          .from("providers")
          .update({ plan_status: "past_due" })
          .eq("id", provider.id);

        if (pastDueError) {
          throw new Error(pastDueError.message);
        }

        result.planPastDue += 1;
      }
    } catch (error) {
      result.failed += 1;
      result.errors.push(
        `${invoice.number}: ${(error as Error).message}`,
      );
    }
  }

  return result;
}
