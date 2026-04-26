import { redirect } from "next/navigation";
import { RegisterForm } from "./register-form";
import { createClient } from "@/lib/supabase/server";
import { getPostLoginRedirect } from "@/lib/auth/roles";

export const metadata = {
  title: "Registracija | zakazi.pro",
};

type RegisterPageProps = {
  searchParams: Promise<{ ref?: string }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    redirect(await getPostLoginRedirect(supabase, data.user));
  }

  const { ref } = await searchParams;
  const refCode = typeof ref === "string" ? ref.trim().toUpperCase() : "";

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <section className="w-full max-w-2xl space-y-8">
        <div className="space-y-3 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Registracija naloga
          </h1>
          <p className="text-muted-foreground">
            Kreiraj nalog za biznis i odmah započni podešavanje termina.
          </p>
        </div>
        <div className="rounded-md border border-border bg-card p-6 text-card-foreground">
          <RegisterForm refCode={refCode} />
        </div>
      </section>
    </main>
  );
}
