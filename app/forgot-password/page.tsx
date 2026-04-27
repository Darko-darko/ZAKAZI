import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = {
  title: "Zaboravljena lozinka | zakazi.pro",
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <section className="w-full max-w-md space-y-8">
        <div className="space-y-3 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Zaboravljena lozinka
          </h1>
          <p className="text-muted-foreground">
            Unesite email naloga i poslaćemo link za postavljanje nove lozinke.
          </p>
        </div>
        <div className="rounded-md border border-border bg-card p-6 text-card-foreground">
          <ForgotPasswordForm />
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Setili ste se lozinke?{" "}
          <Link href="/login" className="font-medium text-foreground">
            Prijavite se
          </Link>
        </p>
      </section>
    </main>
  );
}
