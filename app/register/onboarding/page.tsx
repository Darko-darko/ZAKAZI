import { OnboardingForm } from "./onboarding-form";
import { OnboardingAccess } from "./onboarding-access";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Onboarding | zakazi.pro",
};

type OnboardingPageProps = {
  searchParams: Promise<{
    code?: string;
    error?: string;
    error_description?: string;
    ref?: string;
  }>;
};

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const params = await searchParams;

  if (!userData.user) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <section className="w-full max-w-xl space-y-8">
          <div className="space-y-3 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Potvrda naloga
            </h1>
            <p className="text-muted-foreground">
              Zavrsavamo potvrdu email adrese i pripremamo onboarding.
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-6 text-card-foreground">
            <OnboardingAccess
              code={params.code}
              linkError={params.error || params.error_description}
            />
          </div>
        </section>
      </main>
    );
  }

  const { data: provider } = await supabase
    .from("providers")
    .select("name, slug, phone, city")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const { ref } = params;
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
