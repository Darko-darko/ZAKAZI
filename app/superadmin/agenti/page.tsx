import Link from "next/link";
import { ReferralLinkActions } from "@/app/_components/referral-link-actions";
import { logoutAction } from "@/app/auth/actions";
import { listAgentsForAdmin, listProvidersForAdmin } from "@/lib/auth/agent-compat";
import { normalizeAgentRole } from "@/lib/auth/roles";
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

type AgentNetworkRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  ref_code: string;
  default_commission_percent: number;
  is_active: boolean;
  created_at: string;
  role: "agent" | "commercialist" | null;
  parent_agent_id: string | null;
  archived_at: string | null;
};

export default async function SuperAdminAgentsPage() {
  const { admin } = await requireSuperAdmin();

  const [{ data: agents }, { data: providers }, { data: commissions }] =
    await Promise.all([
      listAgentsForAdmin(admin),
      listProvidersForAdmin(admin),
      admin
        .from("agent_commissions")
        .select("agent_id, amount, status, created_at, approved_at, paid_at"),
    ]);

  const agentRows = (agents ?? []) as AgentNetworkRow[];
  const providerRows = providers ?? [];
  const commissionRows = commissions ?? [];

  const agentNameById = new Map(agentRows.map((agent) => [agent.id, agent.name]));
  const topLevelAgents = agentRows.filter(
    (agent) => normalizeAgentRole(agent.role) === "agent",
  );
  const commercialists = agentRows.filter(
    (agent) => normalizeAgentRole(agent.role) === "commercialist",
  );
  const commercialistsByParent = new Map<string, AgentNetworkRow[]>();

  for (const commercialist of commercialists) {
    if (!commercialist.parent_agent_id) {
      continue;
    }

    const current =
      commercialistsByParent.get(commercialist.parent_agent_id) ?? [];
    current.push(commercialist);
    commercialistsByParent.set(commercialist.parent_agent_id, current);
  }

  const networkProviderCountByAgent = new Map<string, number>();
  const directProviderCountByPartner = new Map<string, number>();

  for (const provider of providerRows) {
    if (provider.agent_id) {
      networkProviderCountByAgent.set(
        provider.agent_id,
        (networkProviderCountByAgent.get(provider.agent_id) ?? 0) + 1,
      );
    }

    if (provider.referrer_agent_id) {
      directProviderCountByPartner.set(
        provider.referrer_agent_id,
        (directProviderCountByPartner.get(provider.referrer_agent_id) ?? 0) + 1,
      );
    }
  }

  const paidByPartner = new Map<string, number>();
  for (const commission of commissionRows) {
    if (commission.status !== "paid") {
      continue;
    }

    paidByPartner.set(
      commission.agent_id,
      (paidByPartner.get(commission.agent_id) ?? 0) + (commission.amount ?? 0),
    );
  }

  const monthlyCommissionsByKey = new Map<string, MonthlyCommissionSummary>();
  for (const commission of commissionRows) {
    const month = commission.created_at.slice(0, 7);
    const key = `${commission.agent_id}:${month}`;
    const current =
      monthlyCommissionsByKey.get(key) ??
      ({
        key,
        agentId: commission.agent_id,
        agentName: agentNameById.get(commission.agent_id) ?? "Partner",
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
              · Mreza partnera
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Agenti i komercijalisti
            </h1>
            <p className="text-muted-foreground">
              Kreiraj agente, prati mrezu i upravljaj provizijama.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/superadmin"
              className="btn-secondary inline-flex min-h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-foreground"
            >
              Super Admin
            </Link>
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

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Agenti</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {topLevelAgents.length}
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Komercijalisti</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {commercialists.length}
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Ukupno partnera</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {agentRows.length}
            </p>
          </div>
        </div>

        <section className="rounded-md border border-border bg-card p-6">
          <h2 className="text-xl font-semibold text-foreground">Novi agent</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Forma kreira auth nalog, agent zapis i referral kod. Agent kasnije sam
            kreira svoje komercijaliste.
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
              Jedna faktura sada moze napraviti vise stavki, na primer za agenta i
              komercijalistu.
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
                            <input type="hidden" name="agent_id" value={summary.agentId} />
                            <input type="hidden" name="month" value={summary.month} />
                            <button className="btn-secondary inline-flex min-h-10 items-center justify-center rounded-md px-3 text-sm font-semibold text-foreground">
                              Odobri obracun
                            </button>
                          </form>
                        ) : null}
                        {openAmount > 0 ? (
                          <form action={markMonthlyCommissionsPaidAction}>
                            <input type="hidden" name="agent_id" value={summary.agentId} />
                            <input type="hidden" name="month" value={summary.month} />
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
          <h2 className="text-xl font-semibold text-foreground">Hijerarhija mreze</h2>
          {topLevelAgents.length ? (
            <div className="grid gap-3">
              {topLevelAgents.map((agent) => {
                const ownedCommercialists = commercialistsByParent.get(agent.id) ?? [];
                const isArchived = Boolean(agent.archived_at);
                const networkProviders = networkProviderCountByAgent.get(agent.id) ?? 0;
                const directProviders = directProviderCountByPartner.get(agent.id) ?? 0;

                return (
                  <article
                    key={agent.id}
                    className="rounded-md border border-border bg-card p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {agent.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {agent.email} · {networkProviders} salona u mrezi ·{" "}
                          {directProviders} direktno njegovih ·{" "}
                          {agent.default_commission_percent}% provizije
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground">
                          {ownedCommercialists.length} komercijalista
                        </span>
                        <span
                          className={`rounded-md border px-2 py-1 text-xs font-medium ${
                            isArchived || !agent.is_active
                              ? "border-border bg-muted text-muted-foreground"
                              : "border-green-500/40 bg-green-500/10 text-green-700"
                          }`}
                        >
                          {isArchived || !agent.is_active ? "Neaktivan" : "Aktivan"}
                        </span>
                      </div>
                    </div>

                    {ownedCommercialists.length ? (
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {ownedCommercialists.map((commercialist) => {
                          const commercialistArchived = Boolean(commercialist.archived_at);

                          return (
                            <div
                              key={commercialist.id}
                              className="rounded-md border border-border bg-background px-3 py-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-medium text-foreground">
                                    {commercialist.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {commercialist.email}
                                  </p>
                                </div>
                                <span className="rounded-md border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                  {commercialist.default_commission_percent}%
                                </span>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span>
                                  Saloni:{" "}
                                  {directProviderCountByPartner.get(commercialist.id) ?? 0}
                                </span>
                                <span>·</span>
                                <span>
                                  {commercialistArchived || !commercialist.is_active
                                    ? "Arhiviran ili neaktivan"
                                    : "Aktivan"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-4 rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
                        Ovaj agent jos nema komercijaliste.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Jos nema agenata. Kreiraj prvog gore.
            </p>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            Svi partneri ({agentRows.length})
          </h2>
          {agentRows.length ? (
            <div className="overflow-x-auto rounded-md border border-border bg-card [touch-action:pan-x]">
              <table className="min-w-[1080px] w-full text-sm">
                <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Partner</th>
                    <th className="px-4 py-3 font-medium">Tip</th>
                    <th className="px-4 py-3 font-medium">Referral link</th>
                    <th className="px-4 py-3 font-medium">Provizija %</th>
                    <th className="px-4 py-3 font-medium">Saloni</th>
                    <th className="px-4 py-3 font-medium">Isplaceno</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {agentRows.map((agent) => {
                    const providerCount =
                      normalizeAgentRole(agent.role) === "commercialist"
                        ? (directProviderCountByPartner.get(agent.id) ?? 0)
                        : (networkProviderCountByAgent.get(agent.id) ?? 0);
                    const totalPaid = paidByPartner.get(agent.id) ?? 0;
                    const isArchived = Boolean(agent.archived_at);

                    return (
                      <tr key={agent.id} className="align-top">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-foreground">{agent.name}</p>
                          <p className="text-xs text-muted-foreground">{agent.email}</p>
                          {agent.phone ? (
                            <p className="text-xs text-muted-foreground">{agent.phone}</p>
                          ) : null}
                          {agent.parent_agent_id ? (
                            <p className="text-xs text-muted-foreground">
                              Nadredjeni agent:{" "}
                              {agentNameById.get(agent.parent_agent_id) ?? "—"}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground">
                            {normalizeAgentRole(agent.role) === "commercialist"
                              ? "Komercijalista"
                              : "Agent"}
                          </span>
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
                              Sacuvaj
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
                                agent.is_active && !isArchived
                                  ? "border-green-500/40 bg-green-500/10 text-green-700"
                                  : "border-border bg-muted text-muted-foreground"
                              }`}
                            >
                              {isArchived
                                ? "Arhiviran"
                                : agent.is_active
                                  ? "Aktivan"
                                  : "Neaktivan"}
                            </span>
                            <form action={toggleAgentActiveAction}>
                              <input type="hidden" name="agent_id" value={agent.id} />
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
              Jos nema partnera u mrezi.
            </p>
          )}
        </section>
      </section>
    </main>
  );
}
