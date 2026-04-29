import Link from "next/link";
import { logoutAction } from "@/app/auth/actions";
import { requireSuperAdmin } from "@/lib/auth/superadmin";
import { confirmInvoicePaymentAction } from "./actions";

export const metadata = {
  title: "Super Admin | zakazi.pro",
};

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

export default async function SuperAdminPage() {
  const { admin } = await requireSuperAdmin();

  const [
    { count: agentsCount },
    { data: providers },
    { data: pendingCommissions },
    { data: invoices },
    { data: agents },
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
  ]);

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
      </section>
    </main>
  );
}
