const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function parseNotificationEmails(value: string | null | undefined) {
  const parts = (value ?? "")
    .split(/[\n,;]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set(parts));
}

export function invalidNotificationEmails(value: string | null | undefined) {
  return parseNotificationEmails(value).filter((email) => !emailPattern.test(email));
}

export function hasNotificationEmailList(value: string | null | undefined) {
  return parseNotificationEmails(value).length > 0;
}

export function formatNotificationEmails(value: string | null | undefined) {
  const emails = parseNotificationEmails(value);
  return emails.length ? emails.join("\n") : null;
}

export function getPrimaryNotificationEmail(value: string | null | undefined) {
  return parseNotificationEmails(value)[0] ?? null;
}

export function mapNotificationRecipients(
  value: string | null | undefined,
  name?: string | null,
) {
  return parseNotificationEmails(value).map((email) => ({
    email,
    name: name ?? undefined,
  }));
}
