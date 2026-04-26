import Link from "next/link";
import { createShiftAction } from "../actions";
import { ShiftForm } from "../shift-form";
import { getCurrentProvider } from "@/lib/admin/provider";

export const metadata = {
  title: "Nova smena | zakazi.pro",
};

export default async function NewShiftPage() {
  await getCurrentProvider();

  return (
    <main className="flex flex-1 px-6 py-10">
      <section className="mx-auto w-full max-w-2xl space-y-8">
        <header>
          <Link
            href="/admin/smene"
            className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            Smene
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            Nova smena
          </h1>
        </header>

        <div className="rounded-md border border-border bg-card p-6">
          <ShiftForm action={createShiftAction} submitLabel="Sacuvaj smenu" />
        </div>
      </section>
    </main>
  );
}
