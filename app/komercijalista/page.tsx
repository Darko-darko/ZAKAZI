import { redirect } from "next/navigation";
import { ReferralLinkActions } from "@/app/_components/referral-link-actions";
import { logoutAction } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { RegisterProviderForm } from "@/app/agent/register-form";
import { normalizeAgentRole } from "@/lib/auth/roles";

export const metadata = {
  title: "Komercijalista | zakazi.pro",
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
  return new Intl.DateTimeFormat("sr-Latn-RS", {
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

export default async function CommercialistPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data: agent } = await supabase
    .from("agents")
    .select(
      "id, name, ref_code, default_commission_percent, role, is_active, archived_at, parent_agent_id",
    )
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!agent) {
    redirect("/admin");
  }

  if (normalizeAgentRole(agent.role) === "agent") {
    redirect("/agent");
  }

  if (!agent.is_active || agent.archived_at) {
    redirect("/login");
  }

  const [{ data: providers }, { data: commissions }, { data: parentAgent }] =
    await Promise.all([
      supabase
        .from("providers")
        .select("id, name, slug, city, plan_status, created_at")
        .eq("referrer_agent_id", agent.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("agent_commissions")
        .select("id, amount, status, created_at, provider_id")
        .eq("agent_id", agent.id)
        .order("created_at", { ascending: false }),
      agent.parent_agent_id
        ? supabase
            .from("agents")
            .select("id, name")
            .eq("id", agent.parent_agent_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const providersById = new Map(
    (providers ?? []).map((provider) => [provider.id, provider.name] as const),
  );
  const totalPaid = (commissions ?? [])
    .filter((item) => item.status === "paid")
    .reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const totalPending = (commissions ?? [])
    .filter((item) => item.status !== "paid")
    .reduce((sum, item) => sum + (item.amount ?? 0), 0);

  return (
    <main className="flex flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-5xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Komercijalista panel
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {agent.name}
            </h1>
            <p className="text-muted-foreground">
              Tvoja provizija: {agent.default_commission_percent}%
              {parentAgent ? ` · Agent: ${parentAgent.name}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={logoutAction}>
              <button className="btn-secondary inline-flex min-h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-foreground">
                Odjavi se
              </button>
            </form>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Moji saloni</p>
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
            Moj referral link
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Kada salon dođe preko ovog linka, pripisuje se tebi.
          </p>
          <div className="mt-4 max-w-2xl">
            <ReferralLinkActions refCode={agent.ref_code} />
          </div>
        </section>

        <section className="rounded-md border border-border bg-card p-6">
          <h2 className="text-xl font-semibold text-foreground">
            Registruj novi salon
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Možeš direktno otvoriti nalog novom salonu i odmah ga vezati za svoj referral.
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
                      {PLAN_STATUS_LABEL[provider.plan_status] ?? provider.plan_status}
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
              Još nema salona na tvom referral-u.
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
                      {COMMISSION_STATUS_LABEL[commission.status] ?? commission.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Provizije će se pojaviti ovde kada neki od tvojih salona plati fakturu.
            </p>
          )}
        </section>
      </section>
    </main>
  );
}
