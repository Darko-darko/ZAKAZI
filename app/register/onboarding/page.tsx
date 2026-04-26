import { redirect } from "next/navigation";
import { OnboardingForm } from "./onboarding-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Onboarding | zakazi.pro",
};

type OnboardingPageProps = {
  searchParams: Promise<{ ref?: string }>;
};

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data: provider } = await supabase
    .from("providers")
    .select("name, slug, phone, city")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const { ref } = await searchParams;
  const refCode = typeof ref === "string" ? ref.trim().toUpperCase() : "";

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <section className="w-full max-w-3xl space-y-8">
        <div className="space-y-3 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Još jedan korak
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Podesi osnovni raspored
          </h1>
          <p className="text-muted-foreground">
            Pripremi nalog za prve termine. Kasnije možeš dodati više radnika,
            usluga i smena.
          </p>
        </div>
        <div className="rounded-md border border-border bg-card p-6 text-card-foreground">
          <OnboardingForm initialProvider={provider} refCode={refCode} />
        </div>
      </section>
    </main>
  );
}
