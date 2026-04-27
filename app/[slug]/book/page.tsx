import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StepConfirm } from "./step-confirm";
import { StepService } from "./step-service";
import { StepSlot } from "./step-slot";
import { StepWorker } from "./step-worker";
import {
  ANY_WORKER,
  buildBookingUrl,
  firstParam,
  todayInBelgrade,
} from "./utils";

type BookingPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS: Record<Step, string> = {
  1: "Osoba",
  2: "Usluga",
  3: "Termin",
  4: "Podaci",
};

function dateFromTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Belgrade",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
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

  const success = firstParam(query.success) === "1";
  const error = firstParam(query.error);
  const workerParam = firstParam(query.worker);
  const serviceParam = firstParam(query.service);
  const slotParam = firstParam(query.slot);
  const dateParam = firstParam(query.date);

  if (success) {
    return (
      <main className="flex flex-1 bg-background px-5 py-8">
        <section className="mx-auto flex w-full max-w-md flex-col justify-center">
          <div className="rounded-md border border-border bg-card p-5">
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Termin je zakazan
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              Hvala, termin je rezervisan.
            </h1>
            <p className="mt-3 text-muted-foreground">
              Potvrda i detalji termina stižu na email.
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

  const { data: workers } = await supabase.rpc("get_public_workers", {
    p_provider_id: provider.id,
  });
  const workerList = workers ?? [];

  const isAnyWorker = workerParam === ANY_WORKER;
  const selectedWorker = workerParam && !isAnyWorker
    ? workerList.find((worker) => worker.id === workerParam)
    : undefined;

  const validWorker = isAnyWorker || Boolean(selectedWorker);
  const effectiveWorkerParam = validWorker ? workerParam! : undefined;

  let step: Step = 1;
  if (validWorker) step = 2;
  if (validWorker && serviceParam) step = 3;
  if (validWorker && serviceParam && slotParam) step = 4;

  const slotStartsAt = slotParam?.split("|")[1];
  const effectiveDate =
    dateParam ?? (slotStartsAt ? dateFromTimestamp(slotStartsAt) : undefined);

  const stepUrl = (target: Step) => {
    if (target === 1) return buildBookingUrl(slug, {});
    if (target === 2) {
      return buildBookingUrl(slug, { worker: effectiveWorkerParam });
    }
    if (target === 3) {
      return buildBookingUrl(slug, {
        worker: effectiveWorkerParam,
        service: serviceParam,
        date: effectiveDate,
      });
    }
    return buildBookingUrl(slug, {
      worker: effectiveWorkerParam,
      service: serviceParam,
      slot: slotParam,
    });
  };

  return (
    <main className="flex-1 bg-background">
      <section className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6 sm:py-8">
        <Link
          href={`/${provider.slug}`}
          className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          ← Nazad na stranicu
        </Link>

        <header className="mt-4">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Online zakazivanje
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
            {provider.name}
          </h1>
        </header>

        <nav aria-label="Koraci" className="mt-5">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {([1, 2, 3, 4] as Step[]).map((index, position) => {
              const isCurrent = index === step;
              const isCompleted = index < step;
              const label = STEP_LABELS[index];

              return (
                <li key={index} className="flex items-center gap-2">
                  {position > 0 ? (
                    <span aria-hidden="true" className="text-muted-foreground">
                      ›
                    </span>
                  ) : null}
                  {isCompleted ? (
                    <Link
                      href={stepUrl(index)}
                      className="font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {label}
                    </Link>
                  ) : (
                    <span
                      className={
                        isCurrent
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground"
                      }
                    >
                      {label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="mt-7">
          {step === 1 ? (
            <StepWorker slug={slug} workers={workerList} />
          ) : null}

          {step === 2 ? (
            <Step2
              supabase={supabase}
              providerId={provider.id}
              slug={slug}
              workerParam={effectiveWorkerParam!}
              isAnyWorker={isAnyWorker}
            />
          ) : null}

          {step === 3 ? (
            <Step3
              supabase={supabase}
              providerId={provider.id}
              slug={slug}
              workerParam={effectiveWorkerParam!}
              isAnyWorker={isAnyWorker}
              serviceId={serviceParam!}
              dateParam={dateParam}
            />
          ) : null}

          {step === 4 ? (
            <Step4
              supabase={supabase}
              providerId={provider.id}
              slug={slug}
              serviceId={serviceParam!}
              slot={slotParam!}
              workerList={workerList}
              error={error}
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function Step2({
  supabase,
  providerId,
  slug,
  workerParam,
  isAnyWorker,
}: {
  supabase: Supabase;
  providerId: string;
  slug: string;
  workerParam: string;
  isAnyWorker: boolean;
}) {
  const { data: services } = await supabase.rpc("get_public_services", {
    p_provider_id: providerId,
    ...(isAnyWorker ? {} : { p_worker_id: workerParam }),
  });

  return (
    <StepService
      slug={slug}
      workerParam={workerParam}
      services={services ?? []}
    />
  );
}

async function Step3({
  supabase,
  providerId,
  slug,
  workerParam,
  isAnyWorker,
  serviceId,
  dateParam,
}: {
  supabase: Supabase;
  providerId: string;
  slug: string;
  workerParam: string;
  isAnyWorker: boolean;
  serviceId: string;
  dateParam: string | undefined;
}) {
  const selectedDate = dateParam ?? todayInBelgrade();
  const { data: slots } = await supabase.rpc("get_public_slots", {
    p_provider_id: providerId,
    p_service_id: serviceId,
    p_date: selectedDate,
    ...(isAnyWorker ? {} : { p_worker_id: workerParam }),
  });
  const orderedSlots = (slots ?? []).slice().sort((a, b) => {
    const timeCompare =
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();

    if (timeCompare !== 0) {
      return timeCompare;
    }

    return a.worker_name.localeCompare(b.worker_name, "sr-Latn-RS");
  });

  return (
    <StepSlot
      slug={slug}
      workerParam={workerParam}
      serviceId={serviceId}
      selectedDate={selectedDate}
      slots={orderedSlots}
      showWorkerName={isAnyWorker}
    />
  );
}

async function Step4({
  supabase,
  providerId,
  slug,
  serviceId,
  slot,
  workerList,
  error,
}: {
  supabase: Supabase;
  providerId: string;
  slug: string;
  serviceId: string;
  slot: string;
  workerList: { id: string; name: string }[];
  error: string | undefined;
}) {
  const [slotWorkerId, startsAt] = slot.split("|");
  const { data: services } = await supabase.rpc("get_public_services", {
    p_provider_id: providerId,
  });
  const service = services?.find((item) => item.id === serviceId);
  const worker = workerList.find((item) => item.id === slotWorkerId);

  if (!service || !worker || !startsAt) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive">
        Termin nije važeći. Vrati se i izaberi ponovo.
      </div>
    );
  }

  return (
    <StepConfirm
      slug={slug}
      service={service}
      workerName={worker.name}
      workerId={worker.id}
      date={dateFromTimestamp(startsAt)}
      startsAt={startsAt}
      error={error}
    />
  );
}
