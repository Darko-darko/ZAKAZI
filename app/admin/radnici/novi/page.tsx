import Link from "next/link";
import { WorkerForm } from "../worker-form";
import { createWorkerAction } from "../actions";
import { getCurrentProvider } from "@/lib/admin/provider";

export const metadata = {
  title: "Novi radnik | zakazi.pro",
};

export default async function NewWorkerPage() {
  await getCurrentProvider();

  return (
    <main className="flex flex-1 px-6 py-10">
      <section className="mx-auto w-full max-w-2xl space-y-8">
        <header>
          <Link
            href="/admin/radnici"
            className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            Radnici
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            Novi radnik
          </h1>
        </header>

        <div className="rounded-md border border-border bg-card p-6">
          <WorkerForm action={createWorkerAction} submitLabel="Sačuvaj radnika" />
        </div>
      </section>
    </main>
  );
}
