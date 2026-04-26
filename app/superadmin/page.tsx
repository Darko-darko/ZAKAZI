import { redirect } from "next/navigation";
import { logoutAction } from "@/app/auth/actions";
import { isSuperAdminEmail } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Super Admin | zakazi.pro",
};

export default async function SuperAdminPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  if (!isSuperAdminEmail(userData.user.email)) {
    redirect("/admin");
  }

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
            <p className="text-sm text-muted-foreground">Saloni</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">0</p>
          </div>
          <div className="rounded-md border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Agenti</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">0</p>
          </div>
          <div className="rounded-md border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Fakture</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">0</p>
          </div>
        </div>
      </section>
    </main>
  );
}
