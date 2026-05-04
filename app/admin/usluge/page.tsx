import Link from "next/link";
import { getCurrentProvider } from "@/lib/admin/provider";

export const metadata = {
  title: "Usluge | zakazi.pro",
};

function formatPrice(price: number | null) {
  if (price === null) {
    return "Cena nije uneta";
  }

  return `${price.toLocaleString("sr-RS")} RSD`;
}

export default async function ServicesPage() {
  const { supabase, provider } = await getCurrentProvider();

  const { data: services } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price, is_active, sort_order")
    .eq("provider_id", provider.id)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  return (
    <main className="flex flex-1 px-6 py-10">
      <section className="mx-auto w-full max-w-5xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              Admin
            </Link>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              Usluge
            </h1>
            <p className="text-muted-foreground">{provider.name}</p>
          </div>
          <Link
            href="/admin/usluge/novi"
            className="btn-primary inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Dodaj uslugu
          </Link>
        </header>

        <div className="overflow-hidden rounded-md border border-border bg-card">
          {services?.length ? (
            <div className="divide-y divide-border">
              {services.map((service) => (
                <Link
                  key={service.id}
                  href={`/admin/usluge/${service.id}`}
                  className="grid gap-3 p-5 transition hover:bg-accent sm:grid-cols-[1fr_auto]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-foreground">
                        {service.name}
                      </h2>
                      <span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
                        {service.is_active ? "Aktivna" : "Neaktivna"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {service.duration_minutes} min · {formatPrice(service.price)}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Redosled: {service.sort_order}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="font-medium text-foreground">Nema usluga.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Dodaj prvu uslugu, pa je zatim povezi sa radnicima koji je rade.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
