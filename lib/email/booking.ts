import "server-only";
import { sendEmail } from "@/lib/email/brevo";
import { createAdminClient } from "@/lib/supabase/admin";

type BookingNotificationRecord = {
  id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  notes: string | null;
  cancel_token: string;
  services: {
    name: string;
    duration_minutes: number;
    price: number | null;
  } | null;
  workers: {
    name: string;
  } | null;
  providers: {
    id: string;
    name: string;
    slug: string;
    custom_domain: string | null;
    billing_email: string | null;
    cancel_min_hours: number;
  } | null;
};

type BookingEmailContext = {
  id: string;
  status: string;
  startsAt: string;
  endsAt: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  notes: string | null;
  cancelToken: string;
  serviceName: string;
  serviceDurationMinutes: number;
  servicePrice: number | null;
  workerName: string;
  providerId: string;
  providerName: string;
  providerSlug: string;
  providerCustomDomain: string | null;
  providerBillingEmail: string | null;
  cancelMinHours: number;
};

type BookingEmailType =
  | "confirmation_client"
  | "confirmation_admin"
  | "cancellation_client"
  | "cancellation_admin";

type BookingEmailTrigger =
  | "public_booking"
  | "admin_manual"
  | "resend"
  | "client_cancellation";

type BookingEmailAttempt = {
  status: "sent" | "failed" | "skipped";
  recipientEmail: string | null;
  subject: string | null;
  brevoMessageId: string | null;
  errorMessage: string | null;
};

type SendBookingEmailsOptions = {
  sendClient?: boolean;
  sendAdmin?: boolean;
  triggerSource?: BookingEmailTrigger;
};

type SendBookingEmailsResult = {
  client: BookingEmailAttempt | null;
  admin: BookingEmailAttempt | null;
  skipped: string | null;
};

type ClientCancellationResult =
  | {
      ok: true;
      slug: string;
      clientEmail: string | null;
      sentClientConfirmation: boolean;
      sentAdminNotification: boolean;
    }
  | {
      ok: false;
      slug?: string;
      reason:
        | "not_found"
        | "already_cancelled"
        | "not_cancellable"
        | "invalid_status";
      message: string;
    };

function readBooleanEnv(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function bookingEmailsEnabled() {
  return readBooleanEnv(process.env.BOOKING_EMAILS_ENABLED, true);
}

function bookingAdminNotificationsEnabled() {
  return readBooleanEnv(process.env.BOOKING_ADMIN_NOTIFICATIONS_ENABLED, true);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("sr-Latn-RS", {
    timeZone: "Europe/Belgrade",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("sr-Latn-RS", {
    timeZone: "Europe/Belgrade",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatSubjectDate(value: string) {
  return new Intl.DateTimeFormat("sr-Latn-RS", {
    timeZone: "Europe/Belgrade",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatPrice(price: number | null) {
  if (price === null) {
    return "Cena po dogovoru";
  }

  return `${price.toLocaleString("sr-Latn-RS")} RSD`;
}

function formatDuration(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return mins === 0 ? `${hours} h` : `${hours} h ${mins} min`;
}

function formatPublicBaseUrl(context: Pick<BookingEmailContext, "providerCustomDomain" | "providerSlug">) {
  if (context.providerCustomDomain) {
    return `https://${context.providerCustomDomain}`;
  }

  return `https://zakazi.pro/${context.providerSlug}`;
}

function formatCancellationUrl(context: Pick<BookingEmailContext, "providerCustomDomain" | "providerSlug" | "cancelToken">) {
  return `${formatPublicBaseUrl(context)}/otkazivanje/${context.cancelToken}`;
}

function buildClientBookingSubject(context: BookingEmailContext) {
  return `Potvrda termina · ${formatSubjectDate(context.startsAt)} · ${context.providerName}`;
}

function buildAdminBookingSubject(context: BookingEmailContext) {
  return `Novo zakazivanje · ${formatSubjectDate(context.startsAt)} · ${context.providerName}`;
}

function buildClientCancellationSubject(context: BookingEmailContext) {
  return `Termin otkazan · ${formatSubjectDate(context.startsAt)} · ${context.providerName}`;
}

function buildAdminCancellationSubject(context: BookingEmailContext) {
  return `Klijent je otkazao termin · ${formatSubjectDate(context.startsAt)} · ${context.providerName}`;
}

function renderInfoRow(label: string, value: string) {
  return `
    <tr>
      <td style="padding: 8px 0; color: #64748b; vertical-align: top;">${escapeHtml(label)}</td>
      <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #0f172a;">${escapeHtml(value)}</td>
    </tr>
  `;
}

function renderButton(label: string, href: string) {
  return `
    <a
      href="${href}"
      style="display: inline-block; padding: 12px 18px; border-radius: 12px; background: #0f766e; color: #f8fafc; font-weight: 700; text-decoration: none;"
    >
      ${escapeHtml(label)}
    </a>
  `;
}

function mapRecordToContext(record: BookingNotificationRecord): BookingEmailContext {
  if (!record.providers || !record.services || !record.workers) {
    throw new Error("Booking nema kompletne podatke za email ili otkazivanje.");
  }

  return {
    id: record.id,
    status: record.status,
    startsAt: record.starts_at,
    endsAt: record.ends_at,
    clientName: record.client_name,
    clientPhone: record.client_phone,
    clientEmail: record.client_email,
    notes: record.notes,
    cancelToken: record.cancel_token,
    serviceName: record.services.name,
    serviceDurationMinutes: record.services.duration_minutes,
    servicePrice: record.services.price,
    workerName: record.workers.name,
    providerId: record.providers.id,
    providerName: record.providers.name,
    providerSlug: record.providers.slug,
    providerCustomDomain: record.providers.custom_domain,
    providerBillingEmail: record.providers.billing_email,
    cancelMinHours: record.providers.cancel_min_hours,
  };
}

async function getBookingContextByQuery(
  column: "id" | "cancel_token",
  value: string,
) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bookings")
    .select(
      "id, status, starts_at, ends_at, client_name, client_phone, client_email, notes, cancel_token, services(name, duration_minutes, price), workers(name), providers(id, name, slug, custom_domain, billing_email, cancel_min_hours)",
    )
    .eq(column, value)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapRecordToContext(data as BookingNotificationRecord);
}

export async function getBookingContextById(bookingId: string) {
  const context = await getBookingContextByQuery("id", bookingId);

  if (!context) {
    throw new Error("Booking nije pronadjen.");
  }

  return context;
}

export async function getBookingContextByCancelToken(cancelToken: string) {
  return getBookingContextByQuery("cancel_token", cancelToken);
}

function getCancellationDeadline(context: BookingEmailContext) {
  return new Date(
    new Date(context.startsAt).getTime() -
      context.cancelMinHours * 60 * 60 * 1000,
  );
}

export function canClientCancelBooking(
  context: BookingEmailContext,
  now = new Date(),
) {
  if (context.status === "cancelled") {
    return false;
  }

  if (context.status !== "confirmed") {
    return false;
  }

  return now.getTime() <= getCancellationDeadline(context).getTime();
}

export function getBookingCancellationWindowMessage(
  context: BookingEmailContext,
) {
  return `Termin se ne moze otkazati manje od ${context.cancelMinHours} ${
    context.cancelMinHours === 1 ? "sata" : "sati"
  } pre pocetka.`;
}

function buildClientBookingEmail(context: BookingEmailContext) {
  const cancellationUrl = formatCancellationUrl(context);
  const notesBlock = context.notes
    ? `
      <div style="margin-top: 16px; padding: 14px 16px; border-radius: 14px; background: #f8fafc; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #0f172a;">Napomena</p>
        <p style="margin: 0; color: #334155;">${escapeHtml(context.notes)}</p>
      </div>
    `
    : "";
  const cancellationBlock = canClientCancelBooking(context)
    ? `
      <div style="margin-top: 20px; padding: 16px 18px; border-radius: 16px; background: #f8fafc; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 8px; font-weight: 700; color: #0f172a;">Ako treba da otkazes termin</p>
        <p style="margin: 0 0 14px; color: #475569;">
          Otkazivanje je moguce najkasnije ${context.cancelMinHours} ${
            context.cancelMinHours === 1 ? "sat" : "sata"
          } pre pocetka.
        </p>
        ${renderButton("Otkazi termin", cancellationUrl)}
      </div>
    `
    : "";

  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #0f172a; max-width: 560px; margin: 0 auto; padding: 24px;">
      <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #0f766e;">
        Potvrda zakazivanja
      </p>
      <h1 style="margin: 0 0 16px; font-size: 24px; line-height: 1.25;">Termin je uspesno zakazan</h1>
      <p style="margin: 0 0 14px;">Zdravo ${escapeHtml(context.clientName)},</p>
      <p style="margin: 0 0 18px; color: #334155;">
        tvoj termin kod salona <strong>${escapeHtml(context.providerName)}</strong> je potvrdjen.
      </p>
      <div style="border-radius: 18px; border: 1px solid #e2e8f0; overflow: hidden;">
        <div style="padding: 16px 18px; background: #0f766e; color: #f8fafc;">
          <p style="margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">
            Termin
          </p>
          <p style="margin: 8px 0 0; font-size: 20px; font-weight: 700;">${escapeHtml(formatDateTime(context.startsAt))}</p>
        </div>
        <div style="padding: 16px 18px;">
          <table style="width: 100%; border-collapse: collapse;">
            ${renderInfoRow("Usluga", context.serviceName)}
            ${renderInfoRow("Radnik", context.workerName)}
            ${renderInfoRow("Trajanje", formatDuration(context.serviceDurationMinutes))}
            ${renderInfoRow("Vreme", `${formatTime(context.startsAt)} - ${formatTime(context.endsAt)}`)}
            ${renderInfoRow("Cena", formatPrice(context.servicePrice))}
            ${renderInfoRow("Telefon", context.clientPhone)}
          </table>
        </div>
      </div>
      ${notesBlock}
      ${cancellationBlock}
      <p style="margin-top: 24px; color: #64748b; font-size: 13px;">
        Ovaj email je transakciona potvrda termina sa platforme zakazi.pro.
      </p>
    </div>
  `;
}

function buildClientBookingText(context: BookingEmailContext) {
  const lines = [
    "Potvrda zakazivanja",
    "",
    `Zdravo ${context.clientName},`,
    `Tvoj termin kod salona ${context.providerName} je potvrdjen.`,
    "",
    `Termin: ${formatDateTime(context.startsAt)}`,
    `Usluga: ${context.serviceName}`,
    `Radnik: ${context.workerName}`,
    `Trajanje: ${formatDuration(context.serviceDurationMinutes)}`,
    `Vreme: ${formatTime(context.startsAt)} - ${formatTime(context.endsAt)}`,
    `Cena: ${formatPrice(context.servicePrice)}`,
    `Telefon: ${context.clientPhone}`,
  ];

  if (context.notes) {
    lines.push(`Napomena: ${context.notes}`);
  }

  if (canClientCancelBooking(context)) {
    lines.push("");
    lines.push(
      `Ako treba da otkazes termin, uradi to najkasnije ${context.cancelMinHours} ${
        context.cancelMinHours === 1 ? "sat" : "sata"
      } pre pocetka:`,
    );
    lines.push(formatCancellationUrl(context));
  }

  lines.push("");
  lines.push("Ovaj email je transakciona potvrda termina sa platforme zakazi.pro.");

  return lines.join("\n");
}

function buildAdminBookingEmail(context: BookingEmailContext) {
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #0f172a; max-width: 560px; margin: 0 auto; padding: 24px;">
      <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #0f766e;">
        Novo zakazivanje
      </p>
      <h1 style="margin: 0 0 16px; font-size: 24px; line-height: 1.25;">Stigla je nova rezervacija</h1>
      <p style="margin: 0 0 18px; color: #334155;">
        Klijent <strong>${escapeHtml(context.clientName)}</strong> je upravo zakazao termin preko javne booking stranice.
      </p>
      <div style="border-radius: 18px; border: 1px solid #e2e8f0; padding: 16px 18px;">
        <table style="width: 100%; border-collapse: collapse;">
          ${renderInfoRow("Termin", formatDateTime(context.startsAt))}
          ${renderInfoRow("Usluga", context.serviceName)}
          ${renderInfoRow("Radnik", context.workerName)}
          ${renderInfoRow("Trajanje", formatDuration(context.serviceDurationMinutes))}
          ${renderInfoRow("Cena", formatPrice(context.servicePrice))}
          ${renderInfoRow("Klijent", context.clientName)}
          ${renderInfoRow("Telefon", context.clientPhone)}
          ${renderInfoRow("Email", context.clientEmail ?? "Nije unet")}
          ${renderInfoRow("Napomena", context.notes || "Nema")}
        </table>
      </div>
      <p style="margin-top: 24px; color: #64748b; font-size: 13px;">
        Provera i dalje upravljanje terminom rade se kroz admin panel.
      </p>
    </div>
  `;
}

function buildAdminBookingText(context: BookingEmailContext) {
  return [
    "Novo zakazivanje",
    "",
    `Klijent ${context.clientName} je upravo zakazao termin preko javne booking stranice.`,
    "",
    `Termin: ${formatDateTime(context.startsAt)}`,
    `Usluga: ${context.serviceName}`,
    `Radnik: ${context.workerName}`,
    `Trajanje: ${formatDuration(context.serviceDurationMinutes)}`,
    `Cena: ${formatPrice(context.servicePrice)}`,
    `Klijent: ${context.clientName}`,
    `Telefon: ${context.clientPhone}`,
    `Email: ${context.clientEmail ?? "Nije unet"}`,
    `Napomena: ${context.notes || "Nema"}`,
  ].join("\n");
}

function buildClientCancellationEmail(context: BookingEmailContext) {
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #0f172a; max-width: 560px; margin: 0 auto; padding: 24px;">
      <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #b45309;">
        Otkazivanje termina
      </p>
      <h1 style="margin: 0 0 16px; font-size: 24px; line-height: 1.25;">Termin je otkazan</h1>
      <p style="margin: 0 0 14px;">Zdravo ${escapeHtml(context.clientName)},</p>
      <p style="margin: 0 0 18px; color: #334155;">
        tvoj termin kod salona <strong>${escapeHtml(context.providerName)}</strong> je uspesno otkazan.
      </p>
      <div style="border-radius: 18px; border: 1px solid #e2e8f0; padding: 16px 18px;">
        <table style="width: 100%; border-collapse: collapse;">
          ${renderInfoRow("Termin", formatDateTime(context.startsAt))}
          ${renderInfoRow("Usluga", context.serviceName)}
          ${renderInfoRow("Radnik", context.workerName)}
        </table>
      </div>
    </div>
  `;
}

function buildClientCancellationText(context: BookingEmailContext) {
  return [
    "Otkazivanje termina",
    "",
    `Zdravo ${context.clientName},`,
    `Tvoj termin kod salona ${context.providerName} je uspesno otkazan.`,
    "",
    `Termin: ${formatDateTime(context.startsAt)}`,
    `Usluga: ${context.serviceName}`,
    `Radnik: ${context.workerName}`,
  ].join("\n");
}

function buildAdminCancellationEmail(context: BookingEmailContext) {
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #0f172a; max-width: 560px; margin: 0 auto; padding: 24px;">
      <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #b45309;">
        Klijent je otkazao termin
      </p>
      <h1 style="margin: 0 0 16px; font-size: 24px; line-height: 1.25;">Termin je otkazan sa javne strane</h1>
      <div style="border-radius: 18px; border: 1px solid #e2e8f0; padding: 16px 18px;">
        <table style="width: 100%; border-collapse: collapse;">
          ${renderInfoRow("Termin", formatDateTime(context.startsAt))}
          ${renderInfoRow("Usluga", context.serviceName)}
          ${renderInfoRow("Radnik", context.workerName)}
          ${renderInfoRow("Klijent", context.clientName)}
          ${renderInfoRow("Telefon", context.clientPhone)}
          ${renderInfoRow("Email", context.clientEmail ?? "Nije unet")}
        </table>
      </div>
    </div>
  `;
}

function buildAdminCancellationText(context: BookingEmailContext) {
  return [
    "Klijent je otkazao termin",
    "",
    `Termin: ${formatDateTime(context.startsAt)}`,
    `Usluga: ${context.serviceName}`,
    `Radnik: ${context.workerName}`,
    `Klijent: ${context.clientName}`,
    `Telefon: ${context.clientPhone}`,
    `Email: ${context.clientEmail ?? "Nije unet"}`,
  ].join("\n");
}

async function recordBookingEmailLog(params: {
  context: BookingEmailContext;
  emailType: BookingEmailType;
  triggerSource: BookingEmailTrigger;
  recipientEmail: string | null;
  subject: string | null;
  status: BookingEmailAttempt["status"];
  brevoMessageId?: string | null;
  errorMessage?: string | null;
}) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("booking_email_logs").insert({
      booking_id: params.context.id,
      provider_id: params.context.providerId,
      email_type: params.emailType,
      trigger_source: params.triggerSource,
      recipient_email: params.recipientEmail,
      subject: params.subject,
      status: params.status,
      brevo_message_id: params.brevoMessageId ?? null,
      error_message: params.errorMessage ?? null,
      sent_at:
        params.status === "sent" ? new Date().toISOString() : null,
    });

    if (error) {
      console.error("Upis booking email loga nije uspeo.", {
        bookingId: params.context.id,
        emailType: params.emailType,
        triggerSource: params.triggerSource,
        error: error.message,
      });
    }
  } catch (error) {
    console.error("Upis booking email loga nije uspeo.", error);
  }
}

async function skipBookingEmail(params: {
  context: BookingEmailContext;
  emailType: BookingEmailType;
  triggerSource: BookingEmailTrigger;
  recipientEmail: string | null;
  subject: string | null;
  reason: string;
}): Promise<BookingEmailAttempt> {
  const attempt: BookingEmailAttempt = {
    status: "skipped",
    recipientEmail: params.recipientEmail,
    subject: params.subject,
    brevoMessageId: null,
    errorMessage: params.reason,
  };

  await recordBookingEmailLog({
    ...params,
    status: attempt.status,
    errorMessage: attempt.errorMessage,
  });

  return attempt;
}

async function sendAndLogBookingEmail(params: {
  context: BookingEmailContext;
  emailType: BookingEmailType;
  triggerSource: BookingEmailTrigger;
  recipientEmail: string | null;
  recipientName?: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  replyTo?: { email: string; name?: string };
  tags: string[];
}): Promise<BookingEmailAttempt> {
  if (!params.recipientEmail) {
    return skipBookingEmail({
      context: params.context,
      emailType: params.emailType,
      triggerSource: params.triggerSource,
      recipientEmail: null,
      subject: params.subject,
      reason: "Primalac nema email adresu.",
    });
  }

  try {
    const result = await sendEmail({
      to: [
        {
          email: params.recipientEmail,
          name: params.recipientName,
        },
      ],
      subject: params.subject,
      htmlContent: params.htmlContent,
      textContent: params.textContent,
      replyTo: params.replyTo,
      tags: params.tags,
    });

    const attempt: BookingEmailAttempt = {
      status: "sent",
      recipientEmail: params.recipientEmail,
      subject: params.subject,
      brevoMessageId: result.messageId,
      errorMessage: null,
    };

    await recordBookingEmailLog({
      context: params.context,
      emailType: params.emailType,
      triggerSource: params.triggerSource,
      recipientEmail: attempt.recipientEmail,
      subject: attempt.subject,
      status: attempt.status,
      brevoMessageId: attempt.brevoMessageId,
    });

    return attempt;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Nepoznata greska pri slanju emaila.";
    const attempt: BookingEmailAttempt = {
      status: "failed",
      recipientEmail: params.recipientEmail,
      subject: params.subject,
      brevoMessageId: null,
      errorMessage,
    };

    await recordBookingEmailLog({
      context: params.context,
      emailType: params.emailType,
      triggerSource: params.triggerSource,
      recipientEmail: attempt.recipientEmail,
      subject: attempt.subject,
      status: attempt.status,
      errorMessage: attempt.errorMessage,
    });

    return attempt;
  }
}

export async function sendBookingEmails(
  bookingId: string,
  options: SendBookingEmailsOptions = {},
): Promise<SendBookingEmailsResult> {
  const context = await getBookingContextById(bookingId);
  const triggerSource = options.triggerSource ?? "public_booking";
  const shouldSendClient = options.sendClient ?? true;
  const shouldSendAdmin = options.sendAdmin ?? true;
  let client: BookingEmailAttempt | null = null;
  let admin: BookingEmailAttempt | null = null;

  if (!bookingEmailsEnabled()) {
    if (shouldSendClient) {
      client = await skipBookingEmail({
        context,
        emailType: "confirmation_client",
        triggerSource,
        recipientEmail: context.clientEmail,
        subject: buildClientBookingSubject(context),
        reason: "BOOKING_EMAILS_ENABLED=false",
      });
    }

    if (shouldSendAdmin) {
      admin = await skipBookingEmail({
        context,
        emailType: "confirmation_admin",
        triggerSource,
        recipientEmail: context.providerBillingEmail,
        subject: buildAdminBookingSubject(context),
        reason: "BOOKING_EMAILS_ENABLED=false",
      });
    }

    return { client, admin, skipped: "BOOKING_EMAILS_ENABLED" };
  }

  if (shouldSendClient) {
    client = await sendAndLogBookingEmail({
      context,
      emailType: "confirmation_client",
      triggerSource,
      recipientEmail: context.clientEmail,
      recipientName: context.clientName,
      subject: buildClientBookingSubject(context),
      htmlContent: buildClientBookingEmail(context),
      textContent: buildClientBookingText(context),
      tags: ["booking-confirmation", context.providerSlug],
      replyTo: context.providerBillingEmail
        ? {
            email: context.providerBillingEmail,
            name: context.providerName,
          }
        : undefined,
    });
  }

  if (shouldSendAdmin) {
    if (!bookingAdminNotificationsEnabled()) {
      admin = await skipBookingEmail({
        context,
        emailType: "confirmation_admin",
        triggerSource,
        recipientEmail: context.providerBillingEmail,
        subject: buildAdminBookingSubject(context),
        reason: "BOOKING_ADMIN_NOTIFICATIONS_ENABLED=false",
      });
    } else {
      admin = await sendAndLogBookingEmail({
        context,
        emailType: "confirmation_admin",
        triggerSource,
        recipientEmail: context.providerBillingEmail,
        recipientName: context.providerName,
        subject: buildAdminBookingSubject(context),
        htmlContent: buildAdminBookingEmail(context),
        textContent: buildAdminBookingText(context),
        tags: ["booking-admin-notification", context.providerSlug],
      });
    }
  }

  return { client, admin, skipped: null };
}

export async function cancelBookingByToken(
  cancelToken: string,
): Promise<ClientCancellationResult> {
  const context = await getBookingContextByCancelToken(cancelToken);

  if (!context) {
    return {
      ok: false,
      reason: "not_found",
      message: "Link za otkazivanje nije vazeci.",
    };
  }

  if (context.status === "cancelled") {
    return {
      ok: false,
      slug: context.providerSlug,
      reason: "already_cancelled",
      message: "Ovaj termin je vec otkazan.",
    };
  }

  if (context.status !== "confirmed") {
    return {
      ok: false,
      slug: context.providerSlug,
      reason: "invalid_status",
      message: "Termin vise nije dostupan za otkazivanje.",
    };
  }

  if (!canClientCancelBooking(context)) {
    return {
      ok: false,
      slug: context.providerSlug,
      reason: "not_cancellable",
      message: getBookingCancellationWindowMessage(context),
    };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_by: "client",
    })
    .eq("id", context.id)
    .eq("status", "confirmed");

  if (error) {
    throw new Error(`Otkazivanje termina nije uspelo: ${error.message}`);
  }

  let sentClientConfirmation = false;
  let sentAdminNotification = false;

  if (bookingEmailsEnabled()) {
    if (context.clientEmail) {
      const clientAttempt = await sendAndLogBookingEmail({
        context,
        emailType: "cancellation_client",
        triggerSource: "client_cancellation",
        recipientEmail: context.clientEmail,
        recipientName: context.clientName,
        subject: buildClientCancellationSubject(context),
        htmlContent: buildClientCancellationEmail(context),
        textContent: buildClientCancellationText(context),
        replyTo: undefined,
        tags: ["booking-cancelled-client", context.providerSlug],
      });
      sentClientConfirmation = clientAttempt.status === "sent";
    }

    if (bookingAdminNotificationsEnabled() && context.providerBillingEmail) {
      const adminAttempt = await sendAndLogBookingEmail({
        context,
        emailType: "cancellation_admin",
        triggerSource: "client_cancellation",
        recipientEmail: context.providerBillingEmail,
        recipientName: context.providerName,
        subject: buildAdminCancellationSubject(context),
        htmlContent: buildAdminCancellationEmail(context),
        textContent: buildAdminCancellationText(context),
        replyTo: undefined,
        tags: ["booking-cancelled-admin", context.providerSlug],
      });
      sentAdminNotification = adminAttempt.status === "sent";
    }
  }

  return {
    ok: true,
    slug: context.providerSlug,
    clientEmail: context.clientEmail,
    sentClientConfirmation,
    sentAdminNotification,
  };
}
