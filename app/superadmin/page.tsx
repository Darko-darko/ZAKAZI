import Link from "next/link";
import { logoutAction } from "@/app/auth/actions";
import { requireSuperAdmin } from "@/lib/auth/superadmin";
import {
  confirmInvoicePaymentAction,
  issueTestInvoiceAction,
  updatePlatformSettingsAction,
} from "./actions";

export const metadata = {
  title: "Super Admin | zakazi.pro",
};

type SuperAdminPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

type ProviderRow = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  billing_email: string | null;
  plan: string;
  plan_status: string;
  agent_id: string | null;
};

type InvoiceRow = {
  id: string;
  provider_id: string;
  number: string;
  amount: number | null;
  status: string;
  due_at: string | null;
  paid_at: string | null;
  payment_claimed_at: string | null;
  payment_method: string | null;
  created_at: string;
};

type AgentRow = {
  id: string;
  name: string;
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat("sr-RS").format(amount) + " RSD";
}

function formatMoneyNullable(amount: number | null) {
  if (amount === null) {
    return "Iznos nije postavljen";
  }

  return formatMoney(amount);
}

function formatDate(value: string | null) {
  if (!value) {
    return "nije postavljeno";
  }

  return new Intl.DateTimeFormat("sr-Latn-RS", {
    timeZone: "Europe/Belgrade",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatPlanStatus(status: string) {
  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function invoiceTone(invoice: InvoiceRow) {
  if (invoice.paid_at || invoice.status === "paid") {
    return {
      label: "Potvrdeno",
      tone: "border-brand/30 bg-brand-soft text-brand",
    };
  }

  if (invoice.payment_claimed_at) {
    return {
      label: "Prijavljeno ceka potvrdu",
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

export default async function SuperAdminPage({
  searchParams,
}: SuperAdminPageProps) {
  const query = await searchParams;
  const notice = firstParam(query.notice) ?? "";
  const error = firstParam(query.error) ?? "";
  const noticeNumber = firstParam(query.number) ?? "";
  const errorReason = firstParam(query.reason) ?? "";
  const { admin } = await requireSuperAdmin();

  const [
    { count: agentsCount },
    { data: providers },
    { data: pendingCommissions },
    { data: invoices },
    { data: agents },
    { data: platformRow },
  ] = await Promise.all([
    admin.from("agents").select("*", { count: "exact", head: true }),
    admin
      .from("providers")
      .select("id, name, slug, city, billing_email, plan, plan_status, agent_id")
      .order("created_at", { ascending: false }),
    admin
      .from("agent_commissions")
      .select("amount, status")
      .neq("status", "paid"),
    admin
      .from("invoices")
      .select(
        "id, provider_id, number, amount, status, due_at, paid_at, payment_claimed_at, payment_method, created_at",
      )
      .neq("status", "cancelled")
      .order("created_at", { ascending: false }),
    admin.from("agents").select("id, name"),
    admin
      .from("platform_settings")
      .select(
        "company_legal_name, company_pib, company_mb, company_address, company_city, company_zip, bank_name, account_number, iban, is_vat_payer, vat_rate, contact_email, contact_phone",
      )
      .eq("id", 1)
      .maybeSingle(),
  ]);

  const platform = platformRow ?? {
    company_legal_name: null,
    company_pib: null,
    company_mb: null,
    company_address: null,
    company_city: null,
    company_zip: null,
    bank_name: null,
    account_number: null,
    iban: null,
    is_vat_payer: false,
    vat_rate: 20,
    contact_email: null,
    contact_phone: null,
  };

  const providerRows = (providers ?? []) as ProviderRow[];
  const invoiceRows = (invoices ?? []) as InvoiceRow[];
  const agentRows = (agents ?? []) as AgentRow[];

  const pendingTotal = (pendingCommissions ?? []).reduce(
    (sum, commission) => sum + (commission.amount ?? 0),
    0,
  );

  const invoicesByProvider = new Map<string, InvoiceRow[]>();
  for (const invoice of invoiceRows) {
    const current = invoicesByProvider.get(invoice.provider_id) ?? [];
    current.push(invoice);
    invoicesByProvider.set(invoice.provider_id, current);
  }

  const agentNameById = new Map(agentRows.map((agent) => [agent.id, agent.name]));

  const providersWithStats = providerRows.map((provider) => {
    const providerInvoices = invoicesByProvider.get(provider.id) ?? [];
    const currentInvoice =
      providerInvoices.find(
        (invoice) =>
          (invoice.status === "issued" || invoice.status === "overdue") &&
          !invoice.paid_at,
      ) ?? null;
    const paymentHistory = providerInvoices.filter((invoice) => Boolean(invoice.paid_at));
    const hasClaimedPayment = providerInvoices.some(
      (invoice) => Boolean(invoice.payment_claimed_at) && !invoice.paid_at,
    );

    return {
      provider,
      currentInvoice,
      paymentHistory,
      hasClaimedPayment,
    };
  });

  const providersCount = providersWithStats.length;
  const claimedPaymentsCount = providersWithStats.filter(
    (item) => item.hasClaimedPayment,
  ).length;

  return (
    <main className="flex flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Platforma
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Super Admin
            </h1>
            <p className="text-muted-foreground">
              Pregled salona, faktura i potvrda uplata na jednom mestu.
            </p>
          </div>
          <form action={logoutAction}>
            <button className="btn-secondary rounded-md px-4 py-2 text-sm font-medium text-foreground">
              Odjavi se
            </button>
          </form>
        </header>

        {notice === "platform-saved" ? (
          <div className="rounded-xl border border-brand/30 bg-brand-soft px-4 py-3 text-sm font-medium text-brand">
            Podaci platforme su sacuvani.
          </div>
        ) : null}

        {error === "platform-save-failed" ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            Cuvanje podataka platforme nije uspelo. Pokusaj ponovo.
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

        {notice === "invoice-issued" && noticeNumber ? (
          <div className="rounded-xl border border-brand/30 bg-brand-soft px-4 py-3 text-sm font-medium text-brand">
            Faktura {noticeNumber} je generisana, sacuvana u storage i poslata na email.
          </div>
        ) : null}

        {error === "invoice-failed" ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            Generisanje fakture nije uspelo.
            {errorReason ? (
              <span className="ml-1 font-normal">{errorReason}</span>
            ) : null}
          </div>
        ) : null}

        {error === "missing-provider" ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            Nedostaje identifikacija salona.
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Agenti</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {agentsCount ?? 0}
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Saloni</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {providersCount}
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Prijavljene uplate</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {claimedPaymentsCount}
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Provizija u obradi</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {formatMoney(pendingTotal)}
            </p>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Sekcije</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/superadmin/agenti"
              className="block rounded-md border border-border bg-card p-5 transition hover:bg-accent"
            >
              <p className="text-base font-semibold text-foreground">
                Agenti →
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Kreiraj nove agente, podesi % provizije, deaktiviraj naloge.
              </p>
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Saloni i evidencija placanja
              </h2>
              <p className="text-sm text-muted-foreground">
                Za svaki salon vidi otvorenu fakturu, prijavljenu uplatu i istoriju potvrda.
              </p>
            </div>
          </div>

          {providersWithStats.length ? (
            <div className="grid gap-4">
              {providersWithStats.map(({ provider, currentInvoice, paymentHistory }) => {
                const currentTone = currentInvoice ? invoiceTone(currentInvoice) : null;

                return (
                  <article
                    key={provider.id}
                    className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-semibold text-foreground">
                            {provider.name}
                          </h3>
                          <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                            {formatPlanStatus(provider.plan_status)}
                          </span>
                          {provider.agent_id ? (
                            <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                              Agent: {agentNameById.get(provider.agent_id) ?? "dodeljen"}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span>zakazi.pro/{provider.slug}</span>
                          {provider.city ? <span>{provider.city}</span> : null}
                          <span>Plan: {provider.plan}</span>
                          {provider.billing_email ? (
                            <span>{provider.billing_email}</span>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[32rem]">
                        <div className="rounded-xl border border-border bg-background p-4">
                          <p className="text-sm font-medium text-muted-foreground">
                            Otvorena stavka
                          </p>
                          {currentInvoice ? (
                            <>
                              <p className="mt-2 text-lg font-semibold text-foreground">
                                Faktura {currentInvoice.number}
                              </p>
                              <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                                {formatMoneyNullable(currentInvoice.amount)}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
                                <span>Rok: {formatDate(currentInvoice.due_at)}</span>
                                {currentInvoice.payment_claimed_at ? (
                                  <span>
                                    Prijavljeno: {formatDate(currentInvoice.payment_claimed_at)}
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span
                                  className={`inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-semibold ${currentTone?.tone ?? ""}`}
                                >
                                  {currentTone?.label}
                                </span>
                              </div>
                            </>
                          ) : (
                            <p className="mt-2 text-sm text-muted-foreground">
                              Trenutno nema otvorene fakture za potvrdu.
                            </p>
                          )}
                        </div>

                        <div className="rounded-xl border border-border bg-background p-4">
                          <p className="text-sm font-medium text-muted-foreground">
                            Akcija
                          </p>
                          {currentInvoice?.payment_claimed_at && !currentInvoice.paid_at ? (
                            <form action={confirmInvoicePaymentAction} className="mt-3">
                              <input
                                type="hidden"
                                name="invoice_id"
                                value={currentInvoice.id}
                              />
                              <button className="btn-primary inline-flex min-h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold text-primary-foreground">
                                Potvrdi uplatu
                              </button>
                            </form>
                          ) : currentInvoice?.paid_at ? (
                            <div className="mt-3 rounded-lg border border-brand/30 bg-brand-soft px-3 py-3 text-sm font-medium text-brand">
                              Uplata je vec potvrdjena.
                            </div>
                          ) : currentInvoice ? (
                            <div className="mt-3 rounded-lg border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
                              Salon jos nije prijavio uplatu.
                            </div>
                          ) : (
                            <div className="mt-3 rounded-lg border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
                              Nema otvorene stavke.
                            </div>
                          )}

                          <Link
                            href={`/${provider.slug}`}
                            target="_blank"
                            className="btn-secondary mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold text-foreground"
                          >
                            Otvori mini sajt
                          </Link>

                          <Link
                            href={`/api/superadmin/invoice-preview?provider_id=${provider.id}`}
                            target="_blank"
                            className="btn-secondary mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold text-foreground"
                          >
                            Pregled PDF-a
                          </Link>

                          <form action={issueTestInvoiceAction} className="mt-2">
                            <input
                              type="hidden"
                              name="provider_id"
                              value={provider.id}
                            />
                            <button
                              type="submit"
                              className="btn-secondary inline-flex min-h-10 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold text-foreground"
                            >
                              Generisi test fakturu (DB + email)
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 border-t border-border pt-5">
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Istorija placanja
                      </h4>
                      {paymentHistory.length ? (
                        <div className="mt-3 grid gap-3 lg:grid-cols-2">
                          {paymentHistory.slice(0, 6).map((invoice) => (
                            <div
                              key={invoice.id}
                              className="rounded-xl border border-border bg-background px-4 py-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-foreground">
                                    Faktura {invoice.number}
                                  </p>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    Potvrdjeno: {formatDate(invoice.paid_at)}
                                  </p>
                                </div>
                                <p className="text-sm font-semibold text-foreground">
                                  {formatMoneyNullable(invoice.amount)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 rounded-xl border border-dashed border-border bg-background px-4 py-4 text-sm text-muted-foreground">
                          Jos nema potvrdjenih uplata za ovaj salon.
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card px-5 py-8 text-sm text-muted-foreground">
              Jos nema registrovanih salona.
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">
              Podaci platforme za fakturisanje
            </h2>
            <p className="text-sm text-muted-foreground">
              Ovi podaci se stampaju kao izdavalac na svakoj fakturi koju
              zakazi.pro izdaje salonima.
            </p>
          </div>

          <form action={updatePlatformSettingsAction} className="mt-6 space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="company_legal_name"
                className="text-sm font-medium text-foreground"
              >
                Pravni naziv firme
              </label>
              <input
                id="company_legal_name"
                name="company_legal_name"
                defaultValue={platform.company_legal_name ?? ""}
                placeholder="zakazi.pro DOO"
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
                  defaultValue={platform.company_pib ?? ""}
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
                  defaultValue={platform.company_mb ?? ""}
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
                defaultValue={platform.company_address ?? ""}
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
                  defaultValue={platform.company_city ?? ""}
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
                  defaultValue={platform.company_zip ?? ""}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </div>
            </div>

            <div className="border-t border-border pt-5">
              <h3 className="text-base font-semibold text-foreground">
                Bankovni racun
              </h3>
              <p className="text-sm text-muted-foreground">
                Prikazuje se na fakturi sa pozivom na broj fakture.
              </p>

              <div className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      htmlFor="bank_name"
                      className="text-sm font-medium text-foreground"
                    >
                      Naziv banke
                    </label>
                    <input
                      id="bank_name"
                      name="bank_name"
                      defaultValue={platform.bank_name ?? ""}
                      placeholder="Banca Intesa"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="account_number"
                      className="text-sm font-medium text-foreground"
                    >
                      Ziro racun
                    </label>
                    <input
                      id="account_number"
                      name="account_number"
                      defaultValue={platform.account_number ?? ""}
                      placeholder="160-0000000000000-00"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="iban"
                    className="text-sm font-medium text-foreground"
                  >
                    IBAN (opciono)
                  </label>
                  <input
                    id="iban"
                    name="iban"
                    defaultValue={platform.iban ?? ""}
                    placeholder="RS35260005601001611379"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-5">
              <h3 className="text-base font-semibold text-foreground">PDV</h3>

              <div className="mt-4 space-y-4">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="is_vat_payer"
                    defaultChecked={platform.is_vat_payer}
                    className="mt-1 size-4 rounded border-input text-primary focus:ring-2 focus:ring-ring/20"
                  />
                  <span>
                    <span className="block text-sm font-medium text-foreground">
                      Obveznik sam PDV-a
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Ako je oznaceno, PDV se obracunava i prikazuje na fakturi.
                    </span>
                  </span>
                </label>

                <div className="space-y-2">
                  <label
                    htmlFor="vat_rate"
                    className="text-sm font-medium text-foreground"
                  >
                    Stopa PDV-a (%)
                  </label>
                  <input
                    id="vat_rate"
                    name="vat_rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    defaultValue={platform.vat_rate ?? 20}
                    className="w-full max-w-[10rem] rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-5">
              <h3 className="text-base font-semibold text-foreground">
                Kontakt na fakturi
              </h3>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="contact_email"
                    className="text-sm font-medium text-foreground"
                  >
                    Email
                  </label>
                  <input
                    id="contact_email"
                    name="contact_email"
                    type="email"
                    defaultValue={platform.contact_email ?? ""}
                    placeholder="podrska@zakazi.pro"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="contact_phone"
                    className="text-sm font-medium text-foreground"
                  >
                    Telefon
                  </label>
                  <input
                    id="contact_phone"
                    name="contact_phone"
                    defaultValue={platform.contact_phone ?? ""}
                    placeholder="+381 21 000 000"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold text-primary-foreground"
            >
              Sacuvaj podatke platforme
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
