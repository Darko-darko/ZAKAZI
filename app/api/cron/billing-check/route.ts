import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron/auth";
import { runBillingCheck } from "@/lib/invoices/billing-cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const unauthorized = authorizeCronRequest(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const result = await runBillingCheck();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Cron za billing proveru nije uspeo.", error);

    return NextResponse.json(
      { error: "Billing provera nije uspela." },
      { status: 500 },
    );
  }
}
