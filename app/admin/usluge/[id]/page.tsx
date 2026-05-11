import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteServiceAction, updateServiceAction } from "../actions";
import { ServiceForm } from "../service-form";
import { getCurrentProvider } from "@/lib/admin/provider";
import { StatusActionButton } from "@/app/admin/termini/status-action-button";

export const metadata = {
  title: "Uredi uslugu | zakazi.pro",
};

type ServiceEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ServiceEditPage({ params }: ServiceEditPageProps) {
  const { id } = await params;
  const { supabase, provider } = await getCurrentProvider();

  const { data: service } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price, sort_order, is_active")
    .eq("id", id)
    .eq("provider_id", provider.id)
    .maybeSingle();

  if (!service) {
    notFound();
  }

  const updateService = updateServiceAction.bind(null, service.id);
  const deleteService = deleteServiceAction.bind(null, service.id);

  return (
    <main className="flex flex-1 px-6 py-10">
      <section className="mx-auto w-full max-w-2xl space-y-8">
        <header>
          <Link
            href="/admin/usluge"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <span aria-hidden="true">&larr;</span>
            <span>Nazad na usluge</span>
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            {service.name}
          </h1>
        </header>

        <div className="rounded-md border border-border bg-card p-6">
          <ServiceForm
            action={updateService}
            service={service}
            submitLabel="Sacuvaj izmene"
            secondaryAction={
              <form action={deleteService}>
                <StatusActionButton confirmMessage="Obrisati ovu uslugu? Ako ima vezane termine, brisanje nece biti dozvoljeno.">
                  Obriši uslugu
                </StatusActionButton>
              </form>
            }
          />
        </div>
      </section>
    </main>
  );
}
