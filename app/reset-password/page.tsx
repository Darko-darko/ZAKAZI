import { ResetPasswordForm } from "./reset-password-form";

export const metadata = {
  title: "Nova lozinka | zakazi.pro",
};

type ResetPasswordPageProps = {
  searchParams: Promise<{ code?: string; error?: string; error_description?: string }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <section className="w-full max-w-md space-y-8">
        <div className="space-y-3 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Nova lozinka
          </h1>
          <p className="text-muted-foreground">
            Unesite novu lozinku za svoj zakazi.pro nalog.
          </p>
        </div>
        <div className="rounded-md border border-border bg-card p-6 text-card-foreground">
          <ResetPasswordForm
            code={params.code}
            linkError={params.error || params.error_description}
          />
        </div>
      </section>
    </main>
  );
}
