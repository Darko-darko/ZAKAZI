import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createBookingAction } from "./actions";
import { FilterForm } from "./filter-form";

type BookingPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

type PublicSlot = {
  worker_id: string;
  worker_name: string;
  starts_at: string;
  ends_at: string;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function todayInBelgrade() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Belgrade",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));

  return next.toISOString().slice(0, 10);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("sr-RS", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("sr-RS", {
    timeZone: "Europe/Belgrade",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatPrice(price: number | null) {
  if (price === null) {
    return "Cena po dogovoru";
  }

  return `${price.toLocaleString("sr-RS")} RSD`;
}

function groupSlots(slots: PublicSlot[] | null | undefined) {
  const groups = new Map<string, PublicSlot[]>();

  for (const slot of slots ?? []) {
    const key = `${slot.starts_at}-${slot.ends_at}`;
    const current = groups.get(key) ?? [];
    current.push(slot);
    groups.set(key, current);
  }

  return Array.from(groups.values()).map((items) => ({
    startsAt: items[0].starts_at,
    endsAt: items[0].ends_at,
    workers: items,
  }));
}

export default async function BookingPage({
  params,
  searchParams,
}: BookingPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: providers } = await supabase.rpc("get_public_provider", {
    p_slug: slug,
  });
  const provider = providers?.[0];

  if (!provider) {
    notFound();
  }

  const [{ data: services }, { data: workers }] = await Promise.all([
    supabase.rpc("get_public_services", { p_provider_id: provider.id }),
    supabase.rpc("get_public_workers", { p_provider_id: provider.id }),
  ]);

  const selectedServiceId = firstParam(query.service) ?? services?.[0]?.id ?? "";
  const selectedWorkerId = firstParam(query.worker) ?? "";
  const selectedDate = firstParam(query.date) ?? todayInBelgrade();
  const success = firstParam(query.success) === "1";
  const error = firstParam(query.error);
  const dates = Array.from({ length: 7 }, (_, index) =>
    addDays(todayInBelgrade(), index),
  );
  const selectedService = services?.find(
    (service) => service.id === selectedServiceId,
  );

  const { data: slots } = selectedServiceId
    ? await supabase.rpc("get_public_slots", {
        p_provider_id: provider.id,
        p_service_id: selectedServiceId,
        p_date: selectedDate,
        ...(selectedWorkerId ? { p_worker_id: selectedWorkerId } : {}),
      })
    : { data: [] };
  const slotGroups = groupSlots(slots);
  const book = createBookingAction.bind(null, provider.slug);

  if (success) {
    return (
      <main className="flex flex-1 bg-background px-5 py-8">
        <section className="mx-auto flex w-full max-w-md flex-col justify-center">
          <div className="rounded-md border border-border bg-card p-5">
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Zahtev je poslat
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              Hvala, termin je rezervisan.
            </h1>
            <p className="mt-3 text-muted-foreground">
              Dobićeš potvrdu kada pružalac usluge obradi zahtev.
            </p>
            <Link
              href={`/${provider.slug}`}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-primary px-4 font-semibold text-primary-foreground"
            >
              Nazad na stranicu
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-background">
      <section className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6 sm:py-8">
        <Link
          href={`/${provider.slug}`}
          className="text-sm font-medium text-muted-foreground"
        >
          Nazad
        </Link>

        <header className="mt-4">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Online zakazivanje
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
            {provider.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Izaberi uslugu, osobu i termin. Zahtev ostaje na čekanju dok ne bude
            potvrđen.
          </p>
        </header>

        {error ? (
          <div className="mt-5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive">
            {error}
          </div>
        ) : null}

        <FilterForm slug={provider.slug} className="mt-6">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Usluga</h2>
            <div className="grid gap-3">
              {services?.map((service) => (
                <label
                  key={service.id}
                  className="flex min-h-16 cursor-pointer items-center gap-3 rounded-md border border-border bg-card p-3 has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary/15"
                >
                  <input
                    type="radio"
                    name="service"
                    value={service.id}
                    defaultChecked={service.id === selectedServiceId}
                    className="size-4 accent-primary"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-foreground">
                      {service.name}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {service.duration_minutes} min · {formatPrice(service.price)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="mt-7 space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Radnik</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-md border border-border bg-card p-3 has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary/15">
                <input
                  type="radio"
                  name="worker"
                  value=""
                  defaultChecked={!selectedWorkerId}
                  className="size-4 accent-primary"
                />
                <span className="font-semibold text-foreground">Bilo ko</span>
              </label>
              {workers?.map((worker) => (
                <label
                  key={worker.id}
                  className="flex min-h-14 cursor-pointer items-center gap-3 rounded-md border border-border bg-card p-3 has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary/15"
                >
                  <input
                    type="radio"
                    name="worker"
                    value={worker.id}
                    defaultChecked={worker.id === selectedWorkerId}
                    className="size-4 accent-primary"
                  />
                  <span className="font-semibold text-foreground">
                    {worker.name}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="mt-7 space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Datum</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {dates.map((date) => (
                <label
                  key={date}
                  className="flex min-h-14 cursor-pointer items-center justify-center rounded-md border border-border bg-card px-3 text-center has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary/15"
                >
                  <input
                    type="radio"
                    name="date"
                    value={date}
                    defaultChecked={date === selectedDate}
                    className="sr-only"
                  />
                  <span className="text-sm font-semibold text-foreground">
                    {formatDate(date)}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <noscript>
            <button
              type="submit"
              className="mt-5 min-h-12 w-full rounded-md border border-border bg-background px-4 font-semibold text-foreground"
            >
              Prikaži slobodne termine
            </button>
          </noscript>
        </FilterForm>

        <form action={book} className="mt-8 space-y-7">
          <input type="hidden" name="service_id" value={selectedServiceId} />
          <input type="hidden" name="worker_id" value={selectedWorkerId} />
          <input type="hidden" name="date" value={selectedDate} />

          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Termin</h2>
              {selectedService ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedService.name}, {formatDate(selectedDate)}
                </p>
              ) : null}
            </div>

            {slotGroups.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {slotGroups.slice(0, 36).map((group) =>
                  group.workers.map((slot) => (
                    <label
                      key={`${slot.worker_id}-${slot.starts_at}`}
                      className="flex min-h-16 cursor-pointer flex-col justify-center rounded-md border border-border bg-card px-3 has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary/15"
                    >
                      <input
                        type="radio"
                        name="slot"
                        value={`${slot.worker_id}|${slot.starts_at}`}
                        required
                        className="sr-only"
                      />
                      <span className="text-base font-bold text-foreground">
                        {formatTime(slot.starts_at)}
                      </span>
                      <span className="mt-1 truncate text-xs text-muted-foreground">
                        {slot.worker_name}
                      </span>
                    </label>
                  )),
                )}
              </div>
            ) : (
              <div className="rounded-md border border-border bg-muted p-4 text-sm text-muted-foreground">
                Nema slobodnih termina za izabrani dan.
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Podaci</h2>
            <div className="space-y-2">
              <label
                htmlFor="client_name"
                className="text-sm font-medium text-foreground"
              >
                Ime i prezime
              </label>
              <input
                id="client_name"
                name="client_name"
                required
                autoComplete="name"
                className="min-h-12 w-full rounded-md border border-input bg-background px-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="client_phone"
                className="text-sm font-medium text-foreground"
              >
                Telefon
              </label>
              <input
                id="client_phone"
                name="client_phone"
                required
                inputMode="tel"
                autoComplete="tel"
                className="min-h-12 w-full rounded-md border border-input bg-background px-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="client_email"
                className="text-sm font-medium text-foreground"
              >
                Email
              </label>
              <input
                id="client_email"
                name="client_email"
                type="email"
                autoComplete="email"
                className="min-h-12 w-full rounded-md border border-input bg-background px-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="notes"
                className="text-sm font-medium text-foreground"
              >
                Napomena
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>
          </section>

          <div className="sticky bottom-0 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
            <button
              type="submit"
              disabled={!slotGroups.length}
              className="min-h-12 w-full rounded-md bg-primary px-4 font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Pošalji zahtev
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
