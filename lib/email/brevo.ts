import "server-only";
import { BrevoClient } from "@getbrevo/brevo";

type BrevoAttachment = {
  name: string;
  content: Buffer;
};

type SendEmailParams = {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  attachments?: BrevoAttachment[];
  replyTo?: { email: string; name?: string };
  tags?: string[];
};

export type SendEmailResult = {
  messageId: string | null;
  messageIds: string[];
};

function getBrevoConfig() {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL;
  const fromName = process.env.BREVO_FROM_NAME ?? "zakazi.pro";

  if (!apiKey || !fromEmail) {
    throw new Error(
      "Brevo nije konfigurisan. Postavi BREVO_API_KEY i BREVO_FROM_EMAIL u .env.local.",
    );
  }

  return { apiKey, fromEmail, fromName };
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const config = getBrevoConfig();

  const client = new BrevoClient({ apiKey: config.apiKey });

  const response = await client.transactionalEmails.sendTransacEmail({
    sender: { email: config.fromEmail, name: config.fromName },
    to: params.to,
    subject: params.subject,
    htmlContent: params.htmlContent,
    textContent: params.textContent,
    replyTo: params.replyTo,
    tags: params.tags,
    attachment: params.attachments?.map((file) => ({
      name: file.name,
      content: file.content.toString("base64"),
    })),
  });

  const messageIds =
    response.messageIds ??
    (response.messageId ? [response.messageId] : []);

  return {
    messageId: response.messageId ?? messageIds[0] ?? null,
    messageIds,
  };
}
