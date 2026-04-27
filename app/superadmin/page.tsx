import Link from "next/link";
import { logoutAction } from "@/app/auth/actions";
import { requireSuperAdmin } from "@/lib/auth/superadmin";

export const metadata = {
  title: "Super Admin | zakazi.pro",
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat("sr-RS").format(amount) + " RSD";
}

export default async function SuperAdminPage() {
  const { admin } = await requireSuperAdmin();

  const [
    { count: agentsCount },
    { count: providersCount },
    { data: pendingCommissions },
  ] = await Promise.all([
    admin.from("agents").select("*", { count: "exact", head: true }),
    admin.from("providers").select("*", { count: "exact", head: true }),
    admin
      .from("agent_commissions")
      .select("amount, status")
      .neq("status", "paid"),
  ]);

  const pendingTotal = (pendingCommissions ?? []).reduce(
    (sum, c) => sum + (c.amount ?? 0),
    0,
  );

  return (
    <main className="flex flex-1 px-6 py-10">
      <section className="mx-auto w-full max-w-5xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Platforma
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Super Admin
            </h1>
            <p className="text-muted-foreground">
              Operativni panel za zakazi.pro.
            </p>
          </div>
          <form action={logoutAction}>
            <button className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent">
              Odjavi se
            </button>
          </form>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Agenti</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {agentsCount ?? 0}
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Saloni</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {providersCount ?? 0}
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
      </section>
    </main>
  );
}
