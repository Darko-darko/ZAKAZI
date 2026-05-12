import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron/auth";
import { sendDueBookingReminders } from "@/lib/email/booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const unauthorized = authorizeCronRequest(request);
  if (unauthorized) {
    return unauthorized;
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
