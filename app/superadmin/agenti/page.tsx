import Link from "next/link";
import { logoutAction } from "@/app/auth/actions";
import { requireSuperAdmin } from "@/lib/auth/superadmin";
import { NewAgentForm } from "./new-agent-form";
import {
  toggleAgentActiveAction,
  updateAgentCommissionAction,
} from "./actions";

export const metadata = {
  title: "Agenti | Super Admin",
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat("sr-RS").format(amount) + " RSD";
}

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
      admin.from("agent_commissions").select("agent_id, amount, status"),
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
          <form action={logoutAction}>
            <button className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent">
              Odjavi se
            </button>
          </form>
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
          <h2 className="text-xl font-semibold text-foreground">
            Svi agenti ({agents?.length ?? 0})
          </h2>
          {agents && agents.length > 0 ? (
            <div className="overflow-hidden rounded-md border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Agent</th>
                    <th className="px-4 py-3 font-medium">Ref kod</th>
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
                          <code className="rounded-md border border-border bg-background px-2 py-1 font-mono text-xs font-semibold">
                            {agent.ref_code}
                          </code>
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
