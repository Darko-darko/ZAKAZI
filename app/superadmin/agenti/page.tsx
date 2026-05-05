import Link from "next/link";
import { ReferralLinkActions } from "@/app/_components/referral-link-actions";
import { logoutAction } from "@/app/auth/actions";
import { requireSuperAdmin } from "@/lib/auth/superadmin";
import { NewAgentForm } from "./new-agent-form";
import {
  approveMonthlyCommissionsAction,
  markMonthlyCommissionsPaidAction,
  toggleAgentActiveAction,
  updateAgentCommissionAction,
} from "./actions";

export const metadata = {
  title: "Agenti | Super Admin",
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat("sr-RS").format(amount) + " RSD";
}

function formatDate(value: string | null) {
  if (!value) {
    return "nije potvrdjeno";
  }

  return new Intl.DateTimeFormat("sr-Latn-RS", {
    timeZone: "Europe/Belgrade",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
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
  agentId: string;
  agentName: string;
  month: string;
  total: number;
  pending: number;
  approved: number;
  paid: number;
  count: number;
  approvedAt: string | null;
  paidAt: string | null;
};

export default async function SuperAdminAgentsPage() {
  const { admin } = await requireSuperAdmin();

  const [{ data: agents }, { data: providers }, { data: commissions }] =
    await Promise.all([
      admin
        .from("agents")
        .select(
          "id, name, email, phone, ref_code, default_commission_percent, is_active, created_at",
        )
        .order("created_at", { ascending: false }),
      admin.from("providers").select("id, agent_id"),
      admin
        .from("agent_commissions")
        .select("agent_id, amount, status, created_at, approved_at, paid_at"),
    ]);

  const providerCountByAgent = new Map<string, number>();
  for (const provider of providers ?? []) {
    if (!provider.agent_id) {
      continue;
    }
    providerCountByAgent.set(
      provider.agent_id,
      (providerCountByAgent.get(provider.agent_id) ?? 0) + 1,
    );
  }

  const paidByAgent = new Map<string, number>();
  for (const commission of commissions ?? []) {
    if (commission.status !== "paid") {
      continue;
    }
    paidByAgent.set(
      commission.agent_id,
      (paidByAgent.get(commission.agent_id) ?? 0) + (commission.amount ?? 0),
    );
  }

  const agentNameById = new Map((agents ?? []).map((agent) => [agent.id, agent.name]));
  const monthlyCommissionsByKey = new Map<string, MonthlyCommissionSummary>();

  for (const commission of commissions ?? []) {
    const month = commission.created_at.slice(0, 7);
    const key = `${commission.agent_id}:${month}`;
    const current =
      monthlyCommissionsByKey.get(key) ??
      ({
        key,
        agentId: commission.agent_id,
        agentName: agentNameById.get(commission.agent_id) ?? "Agent",
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

    monthlyCommissionsByKey.set(key, current);
  }

  const monthlyCommissions = Array.from(monthlyCommissionsByKey.values()).sort(
    (a, b) =>
      b.month.localeCompare(a.month) || a.agentName.localeCompare(b.agentName),
  );

  return (
    <main className="flex flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-6xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              <Link href="/superadmin" className="hover:underline">
                Super Admin
              </Link>{" "}
              · Agenti
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Agenti
            </h1>
            <p className="text-muted-foreground">
              Kreiraj nove agente, podesi provizije, deaktiviraj naloge.
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

        <section className="rounded-md border border-border bg-card p-6">
          <h2 className="text-xl font-semibold text-foreground">Novi agent</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Forma kreira auth nalog + zapis u <code>agents</code> tabeli i
            generiše ref kod. Lozinku diktiraš agentu posle kreiranja.
          </p>
          <div className="mt-5">
            <NewAgentForm />
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Mesecni obracun provizija
            </h2>
            <p className="text-sm text-muted-foreground">
              Provizije se automatski pojavljuju ovde kada je faktura salona
              potvrdjena kao placena.
            </p>
          </div>

          {monthlyCommissions.length ? (
            <div className="grid gap-3">
              {monthlyCommissions.map((summary) => {
                const openAmount = summary.pending + summary.approved;

                return (
                  <article
                    key={summary.key}
                    className="rounded-md border border-border bg-card p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                          {formatMonth(summary.month)}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-foreground">
                          {summary.agentName}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {summary.count} stavki provizije
                        </p>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-4 lg:min-w-[36rem]">
                        <div className="rounded-md border border-border bg-background px-3 py-2">
                          <p className="text-xs text-muted-foreground">Ukupno</p>
                          <p className="font-semibold text-foreground">
                            {formatMoney(summary.total)}
                          </p>
                        </div>
                        <div className="rounded-md border border-border bg-background px-3 py-2">
                          <p className="text-xs text-muted-foreground">Ceka</p>
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
                          <p className="text-xs text-muted-foreground">Isplaceno</p>
                          <p className="font-semibold text-foreground">
                            {formatMoney(summary.paid)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-muted-foreground">
                        <span>Odobreno: {formatDate(summary.approvedAt)}</span>
                        <span className="mx-2">·</span>
                        <span>Isplaceno: {formatDate(summary.paidAt)}</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {summary.pending > 0 ? (
                          <form action={approveMonthlyCommissionsAction}>
                            <input
                              type="hidden"
                              name="agent_id"
                              value={summary.agentId}
                            />
                            <input
                              type="hidden"
                              name="month"
                              value={summary.month}
                            />
                            <button className="btn-secondary inline-flex min-h-10 items-center justify-center rounded-md px-3 text-sm font-semibold text-foreground">
                              Odobri obracun
                            </button>
                          </form>
                        ) : null}
                        {openAmount > 0 ? (
                          <form action={markMonthlyCommissionsPaidAction}>
                            <input
                              type="hidden"
                              name="agent_id"
                              value={summary.agentId}
                            />
                            <input
                              type="hidden"
                              name="month"
                              value={summary.month}
                            />
                            <button className="btn-primary inline-flex min-h-10 items-center justify-center rounded-md px-3 text-sm font-semibold text-primary-foreground">
                              Oznaci isplaceno ({formatMoney(openAmount)})
                            </button>
                          </form>
                        ) : (
                          <span className="inline-flex min-h-10 items-center rounded-md border border-brand/30 bg-brand-soft px-3 text-sm font-semibold text-brand">
                            Isplaceno
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Jos nema provizija za mesecni obracun.
            </p>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            Svi agenti ({agents?.length ?? 0})
          </h2>
          {agents && agents.length > 0 ? (
            <div className="overflow-x-auto rounded-md border border-border bg-card [touch-action:pan-x]">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Agent</th>
                    <th className="px-4 py-3 font-medium">Referral link</th>
                    <th className="px-4 py-3 font-medium">Provizija %</th>
                    <th className="px-4 py-3 font-medium">Saloni</th>
                    <th className="px-4 py-3 font-medium">Isplaćeno</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {agents.map((agent) => {
                    const providerCount = providerCountByAgent.get(agent.id) ?? 0;
                    const totalPaid = paidByAgent.get(agent.id) ?? 0;
                    return (
                      <tr key={agent.id} className="align-top">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-foreground">
                            {agent.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {agent.email}
                          </p>
                          {agent.phone ? (
                            <p className="text-xs text-muted-foreground">
                              {agent.phone}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <ReferralLinkActions refCode={agent.ref_code} compact />
                        </td>
                        <td className="px-4 py-3">
                          <form
                            action={updateAgentCommissionAction}
                            className="flex items-center gap-2"
                          >
                            <input type="hidden" name="agent_id" value={agent.id} />
                            <input
                              type="number"
                              name="default_commission_percent"
                              min={0}
                              max={100}
                              defaultValue={agent.default_commission_percent}
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
                        <td className="px-4 py-3 font-medium text-foreground">
                          {formatMoney(totalPaid)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-start gap-2">
                            <span
                              className={`rounded-md border px-2 py-1 text-xs font-medium ${
                                agent.is_active
                                  ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300"
                                  : "border-border bg-muted text-muted-foreground"
                              }`}
                            >
                              {agent.is_active ? "Aktivan" : "Neaktivan"}
                            </span>
                            <form action={toggleAgentActiveAction}>
                              <input
                                type="hidden"
                                name="agent_id"
                                value={agent.id}
                              />
                              <input
                                type="hidden"
                                name="next_active"
                                value={(!agent.is_active).toString()}
                              />
                              <button
                                type="submit"
                                className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground transition hover:bg-accent"
                              >
                                {agent.is_active ? "Deaktiviraj" : "Aktiviraj"}
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
              Još nema agenata. Kreiraj prvog gore.
            </p>
          )}
        </section>
      </section>
    </main>
  );
}
