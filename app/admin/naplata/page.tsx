import Link from "next/link";
import { getCurrentProvider } from "@/lib/admin/provider";
import { claimInvoicePaymentAction, updateBillingDetailsAction } from "./actions";

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
  payment_method: string | null;
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
      label: "Potvrdjeno",
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

function formatPaymentMethod(method: string | null) {
  if (method === "cash") {
    return "Kes";
  }

  if (method === "virman") {
    return "Poslovni racun";
  }

  return "Nije izabrano";
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const query = await searchParams;
  const notice = firstParam(query.notice) ?? "";
  const error = firstParam(query.error) ?? "";
  const { supabase, provider } = await getCurrentProvider();
  const [{ data }, { data: billingRow }] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, number, amount, status, due_at, paid_at, payment_claimed_at, payment_method, payment_claim_token, pdf_url, created_at",
      )
      .eq("provider_id", provider.id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("providers")
      .select(
        "company_name, company_pib, company_mb, company_address, company_city, company_zip, billing_email",
      )
      .eq("id", provider.id)
      .maybeSingle(),
  ]);

  const billing = billingRow ?? {
    company_name: null,
    company_pib: null,
    company_mb: null,
    company_address: null,
    company_city: null,
    company_zip: null,
    billing_email: null,
  };

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
      return (
        new Date(b.paid_at ?? b.due_at ?? 0).getTime() -
        new Date(a.paid_at ?? a.due_at ?? 0).getTime()
      );
    });

  const canClaimCurrentPayment = Boolean(
    currentInvoice &&
      (currentInvoice.status === "issued" || currentInvoice.status === "overdue") &&
      !currentInvoice.payment_claimed_at,
  );

  const billingRequiredFields = [
    { key: "company_name", label: "Pravni naziv firme", value: billing.company_name },
    { key: "company_pib", label: "PIB", value: billing.company_pib },
    { key: "company_mb", label: "Maticni broj", value: billing.company_mb },
    { key: "company_address", label: "Adresa sedista", value: billing.company_address },
    { key: "company_city", label: "Grad", value: billing.company_city },
    { key: "company_zip", label: "Postanski broj", value: billing.company_zip },
    { key: "billing_email", label: "Email za prijem predracuna", value: billing.billing_email },
  ] as const;
  const missingBillingFields = billingRequiredFields.filter((field) => !field.value);
  const billingComplete = missingBillingFields.length === 0;

  const pdfStoragePaths = invoices
    .map((invoice) => invoice.pdf_url)
    .filter((value): value is string => Boolean(value));
  const signedUrlByPath = new Map<string, string>();
  if (pdfStoragePaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("invoices")
      .createSignedUrls(pdfStoragePaths, 3600);
    for (const item of signed ?? []) {
      if (item.path && item.signedUrl) {
        signedUrlByPath.set(item.path, item.signedUrl);
      }
    }
  }

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
            Prijava uplate nije uspela. Moguce je da je predracun vec prijavljen ili
            nije u statusu za uplatu.
          </div>
        ) : null}

        {error === "invalid-billing-email" ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            Unesite ispravne email adrese za prijem obavestenja i predracuna.
          </div>
        ) : null}

        {error === "missing-token" ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            Nedostaje identifikacija predracuna za prijavu uplate.
          </div>
        ) : null}

        {notice === "billing-saved" ? (
          <div className="rounded-xl border border-brand/30 bg-brand-soft px-4 py-3 text-sm font-medium text-brand">
            Podaci za fakturisanje su sacuvani.
          </div>
        ) : null}

        {error === "billing-save-failed" ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            Cuvanje podataka za fakturisanje nije uspelo. Pokusaj ponovo.
          </div>
        ) : null}

        {error === "invalid-pib" ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            PIB mora imati tacno 9 cifara.
          </div>
        ) : null}

        {error === "invalid-mb" ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            Maticni broj mora imati tacno 8 cifara.
          </div>
        ) : null}

        {!billingComplete ? (
          <div className="rounded-xl border border-warm/40 bg-warm-soft px-4 py-3 text-sm text-foreground">
            <p className="font-semibold">Podaci za fakturisanje nisu kompletni.</p>
            <p className="mt-1">
              Popuni sledeca polja ispod kako bi ti zakazi.pro mogao izdati validan
              predracun:
            </p>
            <ul className="mt-2 list-disc space-y-0.5 pl-5">
              {missingBillingFields.map((field) => (
                <li key={field.key}>{field.label}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Evidencija uplata</h2>
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
                  <span>Nacin: {formatPaymentMethod(currentInvoice.payment_method)}</span>
                  {currentInvoice.payment_claimed_at ? (
                    <span>Prijavljeno: {formatDateLabel(currentInvoice.payment_claimed_at)}</span>
                  ) : null}
                  {currentInvoice.paid_at ? (
                    <span>Potvrdjeno: {formatDateLabel(currentInvoice.paid_at)}</span>
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
                    <fieldset className="mb-3 space-y-2 rounded-lg border border-border bg-background p-3">
                      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Nacin placanja
                      </legend>
                      <label className="flex items-start gap-3 text-sm text-foreground">
                        <input
                          type="radio"
                          name="payment_method"
                          value="virman"
                          defaultChecked
                          className="mt-0.5"
                        />
                        <span>
                          <span className="block font-medium">Poslovni racun</span>
                          <span className="block text-xs text-muted-foreground">
                            Uplata preko firme na racun sa predracuna.
                          </span>
                        </span>
                      </label>
                      <label className="flex items-start gap-3 text-sm text-foreground">
                        <input
                          type="radio"
                          name="payment_method"
                          value="cash"
                          className="mt-0.5"
                        />
                        <span>
                          <span className="block font-medium">Kes</span>
                          <span className="block text-xs text-muted-foreground">
                            Ako je pretplata naplacena uzivo u gotovini.
                          </span>
                        </span>
                      </label>
                    </fieldset>
                    <button className="btn-primary inline-flex min-h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold text-primary-foreground">
                      Prijavi uplatu
                    </button>
                  </form>
                ) : null}

                {currentInvoice.paid_at ? (
                  <div className="rounded-lg border border-brand/30 bg-brand-soft px-3 py-3 text-sm font-medium text-brand">
                    Potvrdjeno
                  </div>
                ) : null}

                {currentInvoice.payment_claimed_at && !currentInvoice.paid_at ? (
                  <div className="rounded-lg border border-primary/20 bg-primary/8 px-3 py-3 text-sm font-medium text-primary">
                    Prijavljeno kao: {formatPaymentMethod(currentInvoice.payment_method)}
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
                      <div className="text-sm text-muted-foreground">
                        <p>{formatDateLabel(invoice.paid_at)}</p>
                        <p className="text-xs">
                          {formatPaymentMethod(invoice.payment_method)}
                        </p>
                      </div>
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
          <h2 className="text-lg font-semibold text-foreground">Pregled predracuna</h2>

          {invoices.length ? (
            <div className="mt-4 space-y-3">
              {invoices.map((invoice) => {
                const signedPdfUrl = invoice.pdf_url
                  ? signedUrlByPath.get(invoice.pdf_url) ?? null
                  : null;

                return (
                  <article
                    key={invoice.id}
                    className="rounded-xl border border-border bg-background px-4 py-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="font-semibold text-foreground">
                          Predracun {invoice.number}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span>{formatDateLabel(invoice.due_at)}</span>
                          <span>{formatMoney(invoice.amount)}</span>
                          <span>{formatPaymentMethod(invoice.payment_method)}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {signedPdfUrl ? (
                          <Link
                            href={signedPdfUrl}
                            target="_blank"
                            className="btn-secondary inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold text-foreground"
                          >
                            Preuzmi PDF
                          </Link>
                        ) : (
                          <div className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-muted-foreground">
                            PDF uskoro
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-border bg-background px-4 py-4 text-sm text-muted-foreground">
              Jos nema izdatih predracuna.
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">
              Podaci za fakturisanje
            </h2>
            <p className="text-sm text-muted-foreground">
              Ovi podaci se stampaju na predracunu koji ti zakazi.pro izdaje. Promenom
              ovih polja menjaju se i sledeci predracuni.
            </p>
          </div>

          <form action={updateBillingDetailsAction} className="mt-5 space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="company_name"
                className="text-sm font-medium text-foreground"
              >
                Pravni naziv firme
              </label>
              <input
                id="company_name"
                name="company_name"
                defaultValue={billing.company_name ?? ""}
                placeholder="npr. Salon Mica DOO"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="company_pib"
                  className="text-sm font-medium text-foreground"
                >
                  PIB (9 cifara)
                </label>
                <input
                  id="company_pib"
                  name="company_pib"
                  inputMode="numeric"
                  pattern="\d{9}"
                  maxLength={9}
                  defaultValue={billing.company_pib ?? ""}
                  placeholder="123456789"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="company_mb"
                  className="text-sm font-medium text-foreground"
                >
                  Maticni broj (8 cifara)
                </label>
                <input
                  id="company_mb"
                  name="company_mb"
                  inputMode="numeric"
                  pattern="\d{8}"
                  maxLength={8}
                  defaultValue={billing.company_mb ?? ""}
                  placeholder="12345678"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="company_address"
                className="text-sm font-medium text-foreground"
              >
                Adresa sedista
              </label>
              <input
                id="company_address"
                name="company_address"
                defaultValue={billing.company_address ?? ""}
                placeholder="Bulevar oslobodjenja 1"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
              <div className="space-y-2">
                <label
                  htmlFor="company_city"
                  className="text-sm font-medium text-foreground"
                >
                  Grad
                </label>
                <input
                  id="company_city"
                  name="company_city"
                  defaultValue={billing.company_city ?? ""}
                  placeholder="Novi Sad"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="company_zip"
                  className="text-sm font-medium text-foreground"
                >
                  Postanski broj
                </label>
                <input
                  id="company_zip"
                  name="company_zip"
                  inputMode="numeric"
                  defaultValue={billing.company_zip ?? ""}
                  placeholder="21000"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="billing_email"
                className="text-sm font-medium text-foreground"
              >
                Emailovi za prijem obavestenja i predracuna
              </label>
              <textarea
                id="billing_email"
                name="billing_email"
                defaultValue={billing.billing_email ?? ""}
                rows={4}
                placeholder={"racuni@salon-mica.rs\nvlasnik@salon-mica.rs"}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
              <p className="text-xs text-muted-foreground">
                Unesite jednu ili vise adresa, odvojene novim redom ili zarezom.
                Na ove emailove zakazi.pro salje predracune i admin obavestenja.
              </p>
            </div>

            <button
              type="submit"
              className="btn-primary inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold text-primary-foreground"
            >
              Sacuvaj podatke
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
