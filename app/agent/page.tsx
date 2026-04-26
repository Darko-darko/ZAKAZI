import { redirect } from "next/navigation";
import { logoutAction } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { RegisterProviderForm } from "./register-form";

export const metadata = {
  title: "Agent | zakazi.pro",
};

const PLAN_STATUS_LABEL: Record<string, string> = {
  trial: "Probni period",
  active: "Aktivan",
  past_due: "Kašnjenje",
  suspended: "Suspendovan",
  cancelled: "Otkazan",
};

const COMMISSION_STATUS_LABEL: Record<string, string> = {
  pending: "Čeka odobrenje",
  approved: "Odobreno",
  paid: "Isplaćeno",
};

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatMoney(amount: number | null) {
  if (amount === null || amount === undefined) {
    return "—";
  }
  return new Intl.NumberFormat("sr-RS").format(amount) + " RSD";
}

export default async function AgentPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data: agent } = await supabase
    .from("agents")
    .select("id, name, ref_code, default_commission_percent")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!agent) {
    redirect("/admin");
  }

  const [{ data: providers }, { data: commissions }] = await Promise.all([
    supabase
      .from("providers")
      .select("id, name, slug, city, plan_status, created_at")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("agent_commissions")
      .select("id, amount, status, created_at, approved_at, paid_at, provider_id")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false }),
  ]);

  const providersById = new Map(
    (providers ?? []).map((p) => [p.id, p.name] as const),
  );

  const totalPaid = (commissions ?? [])
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + (c.amount ?? 0), 0);
  const totalPending = (commissions ?? [])
    .filter((c) => c.status !== "paid")
    .reduce((sum, c) => sum + (c.amount ?? 0), 0);

  return (
    <main className="flex flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-5xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Agent panel
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {agent.name}
            </h1>
            <p className="text-muted-foreground">
              Provizija po default-u: {agent.default_commission_percent}% · Ref
              kod: {agent.ref_code}
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
            <p className="text-sm text-muted-foreground">Mojih salona</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {providers?.length ?? 0}
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Provizija isplaćena</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {formatMoney(totalPaid)}
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Provizija u obradi</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {formatMoney(totalPending)}
            </p>
          </div>
        </div>

        <section className="rounded-md border border-border bg-card p-6">
          <h2 className="text-xl font-semibold text-foreground">
            Registruj novi salon
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Forma kreira nalog klijenta na licu mesta. Lozinku diktiraš klijentu
            posle uspešne registracije.
          </p>
          <div className="mt-5">
            <RegisterProviderForm />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Moji saloni</h2>
          {providers && providers.length > 0 ? (
            <div className="divide-y divide-border rounded-md border border-border bg-card">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-foreground">
                      {provider.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      zakazi.pro/{provider.slug}
                      {provider.city ? ` · ${provider.city}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground">
                      {PLAN_STATUS_LABEL[provider.plan_status] ??
                        provider.plan_status}
                    </span>
                    <span className="text-muted-foreground">
                      {formatDate(provider.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Još nemaš registrovanih salona. Registruj prvi gore.
            </p>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            Moje provizije
          </h2>
          {commissions && commissions.length > 0 ? (
            <div className="divide-y divide-border rounded-md border border-border bg-card">
              {commissions.map((commission) => (
                <div
                  key={commission.id}
                  className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-foreground">
                      {providersById.get(commission.provider_id) ?? "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(commission.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-semibold text-foreground">
                      {formatMoney(commission.amount)}
                    </span>
                    <span className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground">
                      {COMMISSION_STATUS_LABEL[commission.status] ??
                        commission.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Provizije će se pojaviti ovde kada salon plati prvu fakturu.
            </p>
          )}
        </section>
      </section>
    </main>
  );
}
