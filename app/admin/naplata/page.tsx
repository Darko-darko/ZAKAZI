import Link from "next/link";
import { getCurrentProvider } from "@/lib/admin/provider";

export const metadata = {
  title: "Naplata | zakazi.pro",
};

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

export default async function BillingPage() {
  const { supabase, provider } = await getCurrentProvider();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, number, amount, status, due_at, paid_at, payment_claimed_at, created_at")
    .eq("provider_id", provider.id)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(12);

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
              <p className="mt-1 text-sm text-muted-foreground">
                Salon ovde vodi evidenciju sta je placeno, a superadmin kasnije potvrđuje.
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

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <h2 className="text-lg font-semibold text-foreground">Fakture</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Prvi operativni korak: pregled poslednjih faktura i statusa uplate.
            </p>

            {invoices?.length ? (
              <div className="mt-4 space-y-3">
                {invoices.map((invoice) => (
                  <article
                    key={invoice.id}
                    className="rounded-xl border border-border bg-background px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">
                          Faktura {invoice.number}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatMoney(invoice.amount)}
                        </p>
                      </div>
                      <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground">
                        {formatPlanStatus(invoice.status)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>Rok: {invoice.due_at ? invoice.due_at.slice(0, 10) : "nije postavljen"}</span>
                      <span>
                        Prijava uplate:{" "}
                        {invoice.payment_claimed_at ? invoice.payment_claimed_at.slice(0, 10) : "nije prijavljena"}
                      </span>
                      <span>
                        Potvrda: {invoice.paid_at ? invoice.paid_at.slice(0, 10) : "nije potvrđena"}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-border bg-background px-4 py-4 text-sm text-muted-foreground">
                Jos nema kreiranih faktura za ovaj salon.
              </div>
            )}
          </div>

          <aside className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <h2 className="text-lg font-semibold text-foreground">Sledece</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ovde mozemo sledece da dodamo pravi workflow.
            </p>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>Salon oznaci da je uplata poslata.</li>
              <li>Superadmin potvrdi ili odbije prijavu.</li>
              <li>Jasan trag ko je sta prijavio i kada.</li>
            </ul>
          </aside>
        </section>
      </section>
    </main>
  );
}
