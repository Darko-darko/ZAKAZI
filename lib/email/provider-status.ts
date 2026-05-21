import "server-only";

import { sendEmail } from "@/lib/email/brevo";
import { mapNotificationRecipients } from "@/lib/email/notification-emails";

function buildProviderSuspendedEmail(params: {
  providerName: string;
  providerSlug: string;
}) {
  const slugUrl = `https://zakazi.pro/${params.providerSlug}`;

  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #0f172a; max-width: 560px; margin: 0 auto; padding: 24px;">
      <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #b45309;">
        Status naloga
      </p>
      <h1 style="margin: 0 0 16px; font-size: 24px; line-height: 1.25;">Online zakazivanje je privremeno suspendovano</h1>
      <p style="margin: 0 0 12px; font-size: 16px; line-height: 1.6;">
        Nalog za <strong>${params.providerName}</strong> je ručno suspendovan, pa javna stranica trenutno više ne prima nove online rezervacije.
      </p>
      <p style="margin: 0 0 12px; font-size: 16px; line-height: 1.6;">
        Javna stranica ostaje vidljiva na adresi <a href="${slugUrl}" style="color: #0f766e; text-decoration: none;">${slugUrl}</a>, ali je booking privremeno isključen dok se nalog ponovo ne aktivira.
      </p>
      <p style="margin: 24px 0 0; color: #64748b; font-size: 13px;">
        Ako vam je potrebna pomoć, odgovorite na ovaj email ili kontaktirajte podršku zakazi.pro tima.
      </p>
    </div>
  `;
}

export async function sendProviderSuspendedEmail(params: {
  to: string;
  providerName: string;
  providerSlug: string;
}) {
  return sendEmail({
    to: mapNotificationRecipients(params.to, params.providerName),
    subject: `${params.providerName}: online zakazivanje je suspendovano`,
    htmlContent: buildProviderSuspendedEmail(params),
    tags: ["provider-suspended", params.providerSlug],
  });
}
