import { NextResponse, type NextRequest } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/superadmin";
import { getPlan } from "@/lib/plans";
import {
  type InvoiceData,
  type InvoicePartyDetails,
  type InvoicePlatformDetails,
  renderInvoicePdf,
} from "@/lib/invoices/render-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAYMENT_TERM_DAYS = 14;

function firstFilled(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return "";
}

function fallbackText(value: string, fallback = "—") {
  return value || fallback;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export async function GET(request: NextRequest) {
  const { admin } = await requireSuperAdmin();
  const providerId = request.nextUrl.searchParams.get("provider_id");

  if (!providerId) {
    return NextResponse.json(
      { error: "Nedostaje provider_id u query stringu." },
      { status: 400 },
    );
  }

  const [{ data: provider }, { data: platform }] = await Promise.all([
    admin
      .from("providers")
      .select(
        "id, name, plan, trial_ends_at, address, city, company_name, company_pib, company_mb, company_address, company_city, company_zip",
      )
      .eq("id", providerId)
      .maybeSingle(),
    admin
      .from("platform_settings")
      .select(
        "company_legal_name, company_pib, company_mb, company_address, company_city, company_zip, bank_name, account_number, iban, is_vat_payer, vat_rate, contact_email, contact_phone",
      )
      .eq("id", 1)
      .maybeSingle(),
  ]);

  if (!provider) {
    return NextResponse.json({ error: "Provider nije pronadjen." }, { status: 404 });
  }

  const platformDetails: InvoicePlatformDetails = {
    legalName: fallbackText(firstFilled(platform?.company_legal_name), "zakazi.pro"),
    pib: fallbackText(firstFilled(platform?.company_pib)),
    mb: fallbackText(firstFilled(platform?.company_mb)),
    address: fallbackText(firstFilled(platform?.company_address)),
    city: fallbackText(firstFilled(platform?.company_city)),
    zip: fallbackText(firstFilled(platform?.company_zip)),
    bankName: platform?.bank_name ?? null,
    accountNumber: platform?.account_number ?? null,
    iban: platform?.iban ?? null,
    isVatPayer: Boolean(platform?.is_vat_payer),
    vatRate: Number(platform?.vat_rate ?? 20),
    contactEmail: platform?.contact_email ?? null,
    contactPhone: platform?.contact_phone ?? null,
  };

  const customerDetails: InvoicePartyDetails = {
    legalName: fallbackText(firstFilled(provider.company_name, provider.name), provider.name),
    pib: fallbackText(firstFilled(provider.company_pib)),
    mb: fallbackText(firstFilled(provider.company_mb)),
    address: fallbackText(firstFilled(provider.company_address, provider.address)),
    city: fallbackText(firstFilled(provider.company_city, provider.city)),
    zip: fallbackText(firstFilled(provider.company_zip)),
  };

  const planDetails = getPlan(provider.plan);
  const unitPrice =
    planDetails.monthlyPriceRsd > 0 ? planDetails.monthlyPriceRsd : 2900;

  const now = new Date();
  const periodStart = provider.trial_ends_at
    ? new Date(provider.trial_ends_at)
    : now;
  const dueAt = addDays(periodStart, PAYMENT_TERM_DAYS);

  const monthLabel = new Intl.DateTimeFormat("sr-Latn-RS", {
    month: "long",
    year: "numeric",
  }).format(periodStart);

  const invoiceData: InvoiceData = {
    number: "PREVIEW",
    issuedAt: now,
    serviceDate: periodStart,
    dueAt,
    platform: platformDetails,
    customer: customerDetails,
    items: [
      {
        description: `zakazi.pro ${planDetails.label} plan — pretplata za ${monthLabel}`,
        quantity: 1,
        unitPrice,
      },
    ],
    paymentReference: "PREVIEW",
    notes:
      "Ovo je PREGLED predracuna — nije zaveden u sistemu i nije poslat mejlom.",
  };

  const pdfBuffer = await renderInvoicePdf(invoiceData);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="predracun-preview.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
