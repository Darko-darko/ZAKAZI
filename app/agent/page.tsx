import Link from "next/link";
import { redirect } from "next/navigation";
import { ReferralLinkActions } from "@/app/_components/referral-link-actions";
import { logoutAction } from "@/app/auth/actions";
import { getAgentForUser } from "@/lib/auth/agent-compat";
import { normalizeAgentRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import {
  archiveCommercialistAction,
  updateCommercialistCommissionAction,
} from "./actions";
import { NewCommercialistForm } from "./new-commercialist-form";
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

function formatMonth(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);

  return new Intl.DateTimeFormat("sr-Latn-RS", {
    timeZone: "Europe/Belgrade",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, monthIndex - 1, 1)));
}

type MonthlyCommissionSummary = {
  key: string;
  month: string;
  total: number;
  pending: number;
  approved: number;
  paid: number;
  count: number;
  approvedAt: string | null;
  paidAt: string | null;
};

export default async function AgentPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data: agent } = await getAgentForUser(supabase, userData.user.id);

  if (!agent) {
    redirect("/admin");
  }

  if (normalizeAgentRole(agent.role) === "commercialist") {
    redirect("/komercijalista");
  }

  if (!agent.is_active || agent.archived_at) {
    redirect("/login");
  }

  const providersQuery = await supabase
    .from("providers")
    .select("id, name, slug, city, plan_status, created_at, referrer_agent_id")
    .eq("agent_id", agent.id)
    .order("created_at", { ascending: false });
  const legacyProvidersQuery = providersQuery.error?.message
    ?.toLowerCase()
    .includes("referrer_agent_id")
    ? await supabase
        .from("providers")
        .select("id, name, slug, city, plan_status, created_at, agent_id")
        .eq("agent_id", agent.id)
        .order("created_at", { ascending: false })
    : null;

  const [{ data: commissions }, commercialistsQuery] = await Promise.all([
    supabase
      .from("agent_commissions")
      .select("id, amount, status, created_at, approved_at, paid_at, provider_id")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("agents")
      .select(
        "id, name, email, phone, ref_code, default_commission_percent, is_active, archived_at, created_at",
      )
      .eq("parent_agent_id", agent.id)
      .eq("role", "commercialist")
      .order("created_at", { ascending: false }),
  ]);

  const providers =
    providersQuery.data ??
    legacyProvidersQuery?.data?.map((provider) => ({
      ...provider,
      referrer_agent_id: provider.agent_id,
    })) ??
    [];
  const commercialists =
    commercialistsQuery.error?.message?.toLowerCase().includes("parent_agent_id") ||
    commercialistsQuery.error?.message?.toLowerCase().includes("role")
      ? []
      : (commercialistsQuery.data ?? []);

  const commercialistById = new Map(
    (commercialists ?? []).map((item) => [item.id, item]),
  );
  const providersById = new Map(
    (providers ?? []).map((provider) => [provider.id, provider.name] as const),
  );
  const providersByCommercialist = new Map<string, number>();
  let directProviderCount = 0;

  for (const provider of providers ?? []) {
    if (provider.referrer_agent_id === agent.id) {
      directProviderCount += 1;
      continue;
    }

    if (provider.referrer_agent_id) {
      providersByCommercialist.set(
        provider.referrer_agent_id,
        (providersByCommercialist.get(provider.referrer_agent_id) ?? 0) + 1,
      );
    }
  }

  const totalPending = (commissions ?? [])
    .filter((item) => item.status !== "paid")
    .reduce((sum, item) => sum + (item.amount ?? 0), 0);

  const monthlyCommissionsByKey = new Map<string, MonthlyCommissionSummary>();

  for (const commission of commissions ?? []) {
    const month = commission.created_at.slice(0, 7);
    const current =
      monthlyCommissionsByKey.get(month) ??
      ({
        key: month,
        month,
        total: 0,
        pending: 0,
        approved: 0,
        paid: 0,
        count: 0,
        approvedAt: null,
        paidAt: null,
      } satisfies MonthlyCommissionSummary);

    const amount = commission.amount ?? 0;
    current.total += amount;
    current.count += 1;

    if (commission.status === "paid") {
      current.paid += amount;
    } else if (commission.status === "approved") {
      current.approved += amount;
    } else {
      current.pending += amount;
    }

    if (
      commission.approved_at &&
      (!current.approvedAt || commission.approved_at > current.approvedAt)
    ) {
      current.approvedAt = commission.approved_at;
    }

    if (commission.paid_at && (!current.paidAt || commission.paid_at > current.paidAt)) {
      current.paidAt = commission.paid_at;
    }

    monthlyCommissionsByKey.set(month, current);
  }

  const monthlyCommissions = Array.from(monthlyCommissionsByKey.values()).sort(
    (a, b) => b.month.localeCompare(a.month),
  );

  return (
    <main className="flex flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-6xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Agent panel
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {agent.name}
            </h1>
            <p className="text-muted-foreground">
              Tvoja ukupna mrežna provizija: {agent.default_commission_percent}%
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="btn-secondary inline-flex min-h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-foreground"
            >
              Admin panel
            </Link>
            <form action={logoutAction}>
              <button className="btn-secondary inline-flex min-h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-foreground">
                Odjavi se
              </button>
            </form>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Saloni u mreži</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {providers?.length ?? 0}
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Direktno tvoji saloni</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {directProviderCount}
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Komercijalisti</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {commercialists?.length ?? 0}
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
            Kada salon dođe direktno preko ovog linka, pripisuje se tebi.
          </p>
          <div className="mt-4 max-w-2xl">
            <ReferralLinkActions refCode={agent.ref_code} />
          </div>
        </section>

        <section className="rounded-md border border-border bg-card p-6">
          <h2 className="text-xl font-semibold text-foreground">
            Novi komercijalista
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Kreiraš login, referral kod i početni procenat iz svog dela.
          </p>
          <div className="mt-5">
            <NewCommercialistForm maxPercent={agent.default_commission_percent} />
          </div>
        </section>

        <section className="rounded-md border border-border bg-card p-6">
          <h2 className="text-xl font-semibold text-foreground">
            Registruj novi salon
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Možeš direktno registrovati salon, a može i komercijalista iz svog panela.
          </p>
          <div className="mt-5">
            <RegisterProviderForm />
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Tvoji komercijalisti
            </h2>
            <p className="text-sm text-muted-foreground">
              Vidiš referral link, procenat i koliko je salona svaki doveo.
            </p>
          </div>
          {commercialists && commercialists.length > 0 ? (
            <div className="overflow-x-auto rounded-md border border-border bg-card [touch-action:pan-x]">
              <table className="min-w-[880px] w-full text-sm">
                <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Komercijalista</th>
                    <th className="px-4 py-3 font-medium">Referral</th>
                    <th className="px-4 py-3 font-medium">Provizija</th>
                    <th className="px-4 py-3 font-medium">Saloni</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {commercialists.map((commercialist) => {
                    const providerCount =
                      providersByCommercialist.get(commercialist.id) ?? 0;
                    const isArchived = Boolean(commercialist.archived_at);

                    return (
                      <tr key={commercialist.id} className="align-top">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-foreground">
                            {commercialist.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {commercialist.email}
                          </p>
                          {commercialist.phone ? (
                            <p className="text-xs text-muted-foreground">
                              {commercialist.phone}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <ReferralLinkActions
                            refCode={commercialist.ref_code}
                            compact
                          />
                        </td>
                        <td className="px-4 py-3">
                          <form
                            action={updateCommercialistCommissionAction}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="hidden"
                              name="commercialist_id"
                              value={commercialist.id}
                            />
                            <input
                              type="number"
                              name="default_commission_percent"
                              min={0}
                              max={agent.default_commission_percent}
                              defaultValue={commercialist.default_commission_percent}
                              className="w-20 rounded-md border border-input bg-background px-2 py-1 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                            />
                            <button
                              type="submit"
                              className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground transition hover:bg-accent"
                            >
                              Sačuvaj
                            </button>
                          </form>
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {providerCount}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-start gap-2">
                            <span
                              className={`rounded-md border px-2 py-1 text-xs font-medium ${
                                isArchived
                                  ? "border-border bg-muted text-muted-foreground"
                                  : "border-green-500/40 bg-green-500/10 text-green-700"
                              }`}
                            >
                              {isArchived ? "Arhiviran" : "Aktivan"}
                            </span>
                            <form action={archiveCommercialistAction}>
                              <input
                                type="hidden"
                                name="commercialist_id"
                                value={commercialist.id}
                              />
                              <input
                                type="hidden"
                                name="next_archived"
                                value={(!isArchived).toString()}
                              />
                              <button
                                type="submit"
                                className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground transition hover:bg-accent"
                              >
                                {isArchived ? "Vrati iz arhive" : "Arhiviraj"}
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Još nema komercijalista. Kreiraj prvog iz forme iznad.
            </p>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Saloni u mreži</h2>
          {providers && providers.length > 0 ? (
            <div className="divide-y divide-border rounded-md border border-border bg-card">
              {providers.map((provider) => {
                const owner =
                  provider.referrer_agent_id === agent.id
                    ? "Direktno tvoj referral"
                    : commercialistById.get(provider.referrer_agent_id ?? "")?.name ??
                      "Komercijalista";

                return (
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
                      <p className="mt-1 text-xs text-muted-foreground">
                        {owner}
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
                );
              })}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Još nema salona u tvojoj mreži.
            </p>
          )}
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Mesečni obračun
            </h2>
            <p className="text-sm text-muted-foreground">
              Ovde vidiš kada je tvoj deo provizije obračunat, odobren i isplaćen.
            </p>
          </div>
          {monthlyCommissions.length ? (
            <div className="grid gap-3">
              {monthlyCommissions.map((summary) => (
                <article
                  key={summary.key}
                  className="rounded-md border border-border bg-card p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                        {formatMonth(summary.month)}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {formatMoney(summary.total)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {summary.count} stavki provizije
                      </p>
                    </div>
                    <div className="grid gap-2 text-sm sm:min-w-[24rem] sm:grid-cols-3">
                      <div className="rounded-md border border-border bg-background px-3 py-2">
                        <p className="text-xs text-muted-foreground">Čeka</p>
                        <p className="font-semibold text-foreground">
                          {formatMoney(summary.pending)}
                        </p>
                      </div>
                      <div className="rounded-md border border-border bg-background px-3 py-2">
                        <p className="text-xs text-muted-foreground">Odobreno</p>
                        <p className="font-semibold text-foreground">
                          {formatMoney(summary.approved)}
                        </p>
                      </div>
                      <div className="rounded-md border border-border bg-background px-3 py-2">
                        <p className="text-xs text-muted-foreground">Isplaćeno</p>
                        <p className="font-semibold text-foreground">
                          {formatMoney(summary.paid)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                    Odobreno: {formatDate(summary.approvedAt)} · Isplaćeno:{" "}
                    {formatDate(summary.paidAt)}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Još nema mesečnih obračuna.
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
              Provizije će se pojaviti ovde kada salon plati predracun.
            </p>
          )}
        </section>
      </section>
    </main>
  );
}
