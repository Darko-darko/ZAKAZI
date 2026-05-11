import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteShiftAction, updateShiftAction } from "../actions";
import { ShiftForm } from "../shift-form";
import { getCurrentProvider } from "@/lib/admin/provider";
import { StatusActionButton } from "@/app/admin/termini/status-action-button";

export const metadata = {
  title: "Uredi smenu | zakazi.pro",
};

type ShiftEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ShiftEditPage({ params }: ShiftEditPageProps) {
  const { id } = await params;
  const { supabase, provider } = await getCurrentProvider();

  const { data: shift } = await supabase
    .from("shifts")
    .select("id, name, start_time, end_time, break_start, break_end")
    .eq("id", id)
    .eq("provider_id", provider.id)
    .maybeSingle();

  if (!shift) {
    notFound();
  }

  const updateShift = updateShiftAction.bind(null, shift.id);
  const deleteShift = deleteShiftAction.bind(null, shift.id);

  return (
    <main className="flex flex-1 px-6 py-10">
      <section className="mx-auto w-full max-w-2xl space-y-8">
        <header>
          <Link
            href="/admin/smene"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <span aria-hidden="true">&larr;</span>
            <span>Nazad na smene</span>
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            {shift.name}
          </h1>
        </header>

        <div className="rounded-md border border-border bg-card p-6">
          <ShiftForm
            action={updateShift}
            shift={shift}
            submitLabel="Sacuvaj izmene"
            secondaryAction={
              <form action={deleteShift}>
                <StatusActionButton confirmMessage="Obrisati ovu smenu? Postojeci rasporedi koji je koriste ostaće bez dodeljene smene.">
                  Obriši smenu
                </StatusActionButton>
              </form>
            }
          />
        </div>
      </section>
    </main>
  );
}
