import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { createClient } from "@/lib/supabase/server";
import { getPostLoginRedirect } from "@/lib/auth/roles";

export const metadata = {
  title: "Prijava | zakazi.pro",
};

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    redirect(await getPostLoginRedirect(supabase, data.user));
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <section className="w-full max-w-md space-y-8">
        <div className="space-y-3 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Prijava
          </h1>
          <p className="text-muted-foreground">
            Jedan nalog za admin, agente i super admin pristup.
          </p>
        </div>
        <div className="rounded-md border border-border bg-card p-6 text-card-foreground">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
