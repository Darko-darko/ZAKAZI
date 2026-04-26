import Link from "next/link";
import { createServiceAction } from "../actions";
import { ServiceForm } from "../service-form";
import { getCurrentProvider } from "@/lib/admin/provider";

export const metadata = {
  title: "Nova usluga | zakazi.pro",
};

export default async function NewServicePage() {
  await getCurrentProvider();

  return (
    <main className="flex flex-1 px-6 py-10">
      <section className="mx-auto w-full max-w-2xl space-y-8">
        <header>
          <Link
            href="/admin/usluge"
            className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            Usluge
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            Nova usluga
          </h1>
        </header>

        <div className="rounded-md border border-border bg-card p-6">
          <ServiceForm
            action={createServiceAction}
            submitLabel="Sacuvaj uslugu"
          />
        </div>
      </section>
    </main>
  );
}
