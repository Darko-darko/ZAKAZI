import { NextResponse } from "next/server";
import { sendDueBookingReminders } from "@/lib/email/booking";

function normalizeSecret(value: string | undefined | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return "";
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function getBearerToken(authorization: string | null) {
  const normalized = normalizeSecret(authorization);

  if (!normalized.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return normalizeSecret(normalized.slice("bearer ".length));
}

export async function POST(request: Request) {
  const cronSecret = normalizeSecret(process.env.CRON_SECRET);
  const authorization = request.headers.get("authorization");

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET nije konfigurisan." },
      { status: 500 },
    );
  }

  if (getBearerToken(authorization) !== cronSecret) {
    return NextResponse.json({ error: "Nedozvoljen pristup." }, { status: 401 });
  }

  try {
    const result = await sendDueBookingReminders();

    return NextResponse.json({
      ok: true,
      checked: result.checked,
      claimed: result.claimed,
      alreadyProcessed: result.alreadyProcessed,
      sent: result.sent,
      skipped: result.skipped,
      failed: result.failed,
    });
  } catch (error) {
    console.error("Cron za booking remindere nije uspeo.", error);

    return NextResponse.json(
      { error: "Slanje booking remindera nije uspelo." },
      { status: 500 },
    );
  }
}
