import { redirect } from "next/navigation";
import Link from "next/link";
import { logoutAction } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Admin | zakazi.pro",
};

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data: provider } = await supabase
    .from("providers")
    .select("name, slug, city, plan_status")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!provider) {
    redirect("/register/onboarding");
  }

  return (
    <main className="flex flex-1 px-6 py-10">
      <section className="mx-auto w-full max-w-5xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Admin panel
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {provider.name}
            </h1>
            <p className="text-muted-foreground">
              zakazi.pro/{provider.slug}
              {provider.city ? ` · ${provider.city}` : ""}
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
            <p className="text-sm text-muted-foreground">Status plana</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {provider.plan_status}
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Danas</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">0</p>
          </div>
          <div className="rounded-md border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Novi zahtevi</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">0</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin/radnici"
            className="rounded-md border border-border bg-card p-5 transition hover:bg-accent"
          >
            <h2 className="font-semibold text-foreground">Radnici</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Dodavanje i uređivanje radnika.
            </p>
          </Link>
          <Link
            href="/admin/usluge"
            className="rounded-md border border-border bg-card p-5 transition hover:bg-accent"
          >
            <h2 className="font-semibold text-foreground">Usluge</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cenovnik, trajanje i status usluga.
            </p>
          </Link>
          <Link
            href="/admin/smene"
            className="rounded-md border border-border bg-card p-5 transition hover:bg-accent"
          >
            <h2 className="font-semibold text-foreground">Smene</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Radno vreme i raspored.
            </p>
          </Link>
          <div className="rounded-md border border-border bg-card p-5 opacity-70">
            <h2 className="font-semibold text-foreground">Sajt</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tekst, brending i galerija.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
