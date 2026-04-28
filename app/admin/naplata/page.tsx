import Link from "next/link";
import { getCurrentProvider } from "@/lib/admin/provider";
import { claimInvoicePaymentAction } from "./actions";

export const metadata = {
  title: "Naplata | zakazi.pro",
};

type BillingPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

type InvoiceRow = {
  id: string;
  number: string;
  amount: number | null;
  status: string;
  due_at: string | null;
  paid_at: string | null;
  payment_claimed_at: string | null;
  payment_claim_token: string;
  pdf_url: string | null;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatPlanStatus(status: string) {
  if (!status) {
    return "Nije postavljeno";
  }

  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatMoney(value: number | null) {
  if (value === null) {
    return "Iznos nije postavljen";
  }

  return `${new Intl.NumberFormat("sr-Latn-RS").format(value)} RSD`;
}

function formatDateLabel(value: string | null) {
  if (!value) {
    return "nije postavljen";
  }

  return new Intl.DateTimeFormat("sr-Latn-RS", {
    timeZone: "Europe/Belgrade",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function paymentStatus(invoice: InvoiceRow) {
  if (invoice.paid_at || invoice.status === "paid") {
    return {
      label: "Potvrdeno",
      tone: "border-brand/30 bg-brand-soft text-brand",
    };
  }

  if (invoice.payment_claimed_at) {
    return {
      label: "Prijavljeno",
      tone: "border-primary/20 bg-primary/8 text-primary",
    };
  }

  if (invoice.status === "overdue") {
    return {
      label: "Kasni",
      tone: "border-destructive/30 bg-destructive/10 text-destructive",
    };
  }

  return {
    label: "Ceka uplatu",
    tone: "border-warm/35 bg-warm-soft text-foreground",
  };
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const query = await searchParams;
  const notice = firstParam(query.notice) ?? "";
  const error = firstParam(query.error) ?? "";
  const { supabase, provider } = await getCurrentProvider();
  const { data } = await supabase
    .from("invoices")
    .select(
      "id, number, amount, status, due_at, paid_at, payment_claimed_at, payment_claim_token, pdf_url, created_at",
    )
    .eq("provider_id", provider.id)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(20);

  const invoices = (data ?? []) as InvoiceRow[];
  const currentInvoice =
    invoices.find(
      (invoice) =>
        (invoice.status === "issued" || invoice.status === "overdue") &&
        !invoice.paid_at,
    ) ?? null;
  const confirmedPayments = invoices
    .filter((invoice) => Boolean(invoice.paid_at))
    .sort((a, b) => {
      return new Date(b.paid_at ?? b.due_at ?? 0).getTime() - new Date(a.paid_at ?? a.due_at ?? 0).getTime();
    });

  const canClaimCurrentPayment = Boolean(
    currentInvoice &&
      (currentInvoice.status === "issued" || currentInvoice.status === "overdue") &&
      !currentInvoice.payment_claimed_at,
  );

  return (
    <main className="flex flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-6xl space-y-6">
        <header className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Admin panel
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                Naplata
              </h1>
              <p className="mt-2 text-muted-foreground">
                {provider.name} · status plana: {formatPlanStatus(provider.plan_status)}
              </p>
            </div>
            <Link
              href="/admin/termini"
              className="btn-secondary inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold text-foreground"
            >
              Nazad na termine
            </Link>
          </div>
        </header>

        {notice === "payment-claimed" ? (
          <div className="rounded-xl border border-brand/30 bg-brand-soft px-4 py-3 text-sm font-medium text-brand">
            Uplata je prijavljena. Sada ceka potvrdu superadmina.
          </div>
        ) : null}

        {error === "claim-failed" ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            Prijava uplate nije uspela. Moguce je da je faktura vec prijavljena ili
            nije u statusu za uplatu.
          </div>
        ) : null}

        {error === "missing-token" ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            Nedostaje identifikacija fakture za prijavu uplate.
          </div>
        ) : null}

        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Evidencija uplata
              </h2>
            </div>

            {currentInvoice ? (
              <span
                className={`inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-semibold ${paymentStatus(currentInvoice).tone}`}
              >
                {paymentStatus(currentInvoice).label}
              </span>
            ) : null}
          </div>

          {currentInvoice ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="rounded-2xl border border-border/80 bg-background px-4 py-4 sm:px-5">
                <p className="text-sm font-medium text-muted-foreground">
                  Otvorena uplata
                </p>
                <p className="mt-3 text-4xl font-bold tracking-tight text-foreground">
                  {formatMoney(currentInvoice.amount)}
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span>Rok: {formatDateLabel(currentInvoice.due_at)}</span>
                  {currentInvoice.payment_claimed_at ? (
                    <span>Prijavljeno: {formatDateLabel(currentInvoice.payment_claimed_at)}</span>
                  ) : null}
                  {currentInvoice.paid_at ? (
                    <span>Potvrdeno: {formatDateLabel(currentInvoice.paid_at)}</span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {canClaimCurrentPayment ? (
                  <form action={claimInvoicePaymentAction}>
                    <input
                      type="hidden"
                      name="payment_claim_token"
                      value={currentInvoice.payment_claim_token}
                    />
                    <button className="btn-primary inline-flex min-h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold text-primary-foreground">
                      Prijavi uplatu
                    </button>
                  </form>
                ) : null}

                {currentInvoice.paid_at ? (
                  <div className="rounded-lg border border-brand/30 bg-brand-soft px-3 py-3 text-sm font-medium text-brand">
                    Potvrdeno
                  </div>
                ) : null}

                {currentInvoice.payment_claimed_at && !currentInvoice.paid_at ? (
                  <div className="flex items-center justify-center rounded-lg border border-primary/20 bg-primary/8 px-3 py-3 text-sm font-medium text-primary">
                    Prijavljeno
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-border bg-background px-4 py-5 text-sm text-muted-foreground">
              Trenutno nema otvorene stavke za uplatu.
            </div>
          )}

          {confirmedPayments.length ? (
            <div className="mt-5 border-t border-border pt-5">
              <div className="space-y-2">
                {confirmedPayments.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-6 items-center justify-center rounded-full bg-brand text-xs font-bold text-brand-foreground">
                        ✓
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatDateLabel(invoice.paid_at)}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {formatMoney(invoice.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-semibold text-foreground">Pregled faktura</h2>

          {invoices.length ? (
            <div className="mt-4 space-y-3">
              {invoices.map((invoice) => {
                const accountantHref = provider.billing_email
                  ? `mailto:${provider.billing_email}?subject=Faktura%20${encodeURIComponent(invoice.number)}&body=${encodeURIComponent(
                      invoice.pdf_url ?? "Faktura jos nema PDF link.",
                    )}`
                  : null;

                return (
                  <article
                    key={invoice.id}
                    className="rounded-xl border border-border bg-background px-4 py-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="font-semibold text-foreground">
                          Faktura {invoice.number}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span>{formatDateLabel(invoice.due_at)}</span>
                          <span>{formatMoney(invoice.amount)}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {invoice.pdf_url ? (
                          <Link
                            href={invoice.pdf_url}
                            target="_blank"
                            className="btn-secondary inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold text-foreground"
                          >
                            Download PDF
                          </Link>
                        ) : (
                          <div className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-muted-foreground">
                            PDF uskoro
                          </div>
                        )}

                        {accountantHref ? (
                          <Link
                            href={accountantHref}
                            className="btn-secondary inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold text-foreground"
                          >
                            Posalji knjigovodji
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-border bg-background px-4 py-4 text-sm text-muted-foreground">
              Jos nema izdatih faktura.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
