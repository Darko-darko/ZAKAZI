import Link from "next/link";
import { AccountSettingsForm } from "./account-settings-form";
import { AdminBackLink } from "@/app/admin/_components/admin-back-link";
import { getCurrentProvider } from "@/lib/admin/provider";

export const metadata = {
  title: "Nalog | zakazi.pro",
};

export default async function AdminAccountPage() {
  const { provider, user } = await getCurrentProvider();

  return (
    <main className="flex flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-4xl space-y-6">
        <header className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                <span>Admin</span>
                <span className="h-1 w-1 rounded-full bg-brand/40" />
                <span>Nalog</span>
              </div>
              <AdminBackLink />
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Podešavanja naloga
              </h1>
              <p className="text-muted-foreground">
                Upravljaj pristupom, lozinkom i emailovima za {provider.name}.
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

        <AccountSettingsForm
          currentLoginEmail={user.email ?? ""}
          notificationEmails={provider.billing_email ?? ""}
        />
      </section>
    </main>
  );
}
