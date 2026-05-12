import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron/auth";
import { createMonthlyInvoices } from "@/lib/invoices/billing-cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const unauthorized = authorizeCronRequest(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const result = await createMonthlyInvoices();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Cron za kreiranje faktura nije uspeo.", error);

    return NextResponse.json(
      { error: "Kreiranje faktura nije uspelo." },
      { status: 500 },
    );
  }
}
