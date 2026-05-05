import { NextResponse } from "next/server";
import { sendDueBookingReminders } from "@/lib/email/booking";

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET nije konfigurisan." },
      { status: 500 },
    );
  }

  if (authorization !== `Bearer ${cronSecret}`) {
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
