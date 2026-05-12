import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
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
type BookingEmailStatus = "sent" | "failed" | "skipped" | "unknown";

const STEP_LABELS: Record<Step, string> = {
  1: "Radnik",
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

function resolveBookingSuccessCopy(status: string | undefined) {
  const emailStatus = (status ?? "unknown") as BookingEmailStatus;

  if (emailStatus === "sent") {
    return {
      tone: "border-brand/20 bg-brand-soft/40 text-foreground",
      message:
        "Potvrda termina i link za otkazivanje poslati su na unetu email adresu.",
    };
  }

  if (emailStatus === "failed") {
    return {
      tone: "border-amber-300/40 bg-amber-50 text-amber-900",
      message:
        "Termin je uspesno zakazan, ali potvrdu emailom trenutno nismo uspeli da posaljemo. Ako ne stigne, kontaktiraj salon.",
    };
  }

  if (emailStatus === "skipped") {
    return {
      tone: "border-amber-300/40 bg-amber-50 text-amber-900",
      message:
        "Termin je uspesno zakazan, ali potvrda emailom trenutno nije poslata. Ako ti je potrebna potvrda, kontaktiraj salon.",
    };
  }

  return {
    tone: "border-amber-300/40 bg-amber-50 text-amber-900",
    message:
      "Termin je uspesno zakazan. Status email potvrde trenutno nije dostupan, pa proveri sanduce ili kontaktiraj salon ako je potrebno.",
  };
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
  const emailStatus = firstParam(query.email);
  const error = firstParam(query.error);
  const workerParam = firstParam(query.worker);
  const serviceParam = firstParam(query.service);
  const slotParam = firstParam(query.slot);
  const dateParam = firstParam(query.date);

  if (success) {
    const successCopy = resolveBookingSuccessCopy(emailStatus);

    return (
      <main className="flex flex-1 bg-background px-5 py-8">
        <section className="mx-auto flex w-full max-w-md flex-col justify-center">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
                aria-hidden
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <p className="mt-4 text-sm font-medium uppercase tracking-wide text-brand">
              Termin je zakazan
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              Hvala, termin je uspesno zakazan.
            </h1>
            <div
              className={`mt-4 rounded-xl border px-4 py-3 text-sm ${successCopy.tone}`}
            >
              {successCopy.message}
            </div>
            <Link
              href={`/${provider.slug}`}
              className="btn-primary mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl px-4 font-semibold text-primary-foreground"
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
  const selectedWorker =
    workerParam && !isAnyWorker
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
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-brand"
        >
          <span aria-hidden>&lt;-</span> Nazad na stranicu
        </Link>

        <header className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">
            Online zakazivanje
          </p>
          <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-foreground">
            {provider.name}
          </h1>
        </header>

        <nav aria-label="Koraci" className="mt-6">
          <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-brand transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
          <ol className="flex items-center gap-1.5 text-sm sm:gap-2">
            {([1, 2, 3, 4] as Step[]).map((index, position) => {
              const isCurrent = index === step;
              const isCompleted = index < step;
              const label = STEP_LABELS[index];

              const itemBase =
                "inline-flex items-center gap-1.5 rounded-full transition";
              const itemPadding = isCurrent
                ? "px-3 py-1"
                : "p-0.5 sm:px-3 sm:py-1";
              const itemColors = isCurrent
                ? "bg-brand text-brand-foreground font-semibold shadow-sm"
                : isCompleted
                  ? "text-brand font-medium hover:bg-brand-soft sm:bg-brand-soft sm:hover:bg-brand sm:hover:text-brand-foreground"
                  : "text-muted-foreground";

              const itemClass = `${itemBase} ${itemPadding} ${itemColors}`;

              const numberBadge = (
                <span
                  className={
                    isCurrent
                      ? "grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-foreground/20 text-[10px] font-bold"
                      : isCompleted
                        ? "grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-[10px] font-bold text-brand-foreground"
                        : "grid h-5 w-5 shrink-0 place-items-center rounded-full border border-border bg-background text-[10px] font-bold"
                  }
                >
                  {isCompleted ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3 w-3"
                      aria-hidden
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  ) : (
                    index
                  )}
                </span>
              );

              const labelEl = (
                <span className={isCurrent ? "" : "hidden sm:inline"}>
                  {label}
                </span>
              );

              const connectorColor =
                isCompleted || isCurrent ? "bg-brand" : "bg-border";

              return (
                <Fragment key={index}>
                  {position > 0 ? (
                    <li
                      role="presentation"
                      aria-hidden
                      className={`h-px flex-1 ${connectorColor} sm:hidden`}
                    />
                  ) : null}
                  <li className="shrink-0">
                    {isCompleted ? (
                      <Link href={stepUrl(index)} className={itemClass}>
                        {numberBadge}
                        {labelEl}
                      </Link>
                    ) : (
                      <span className={itemClass}>
                        {numberBadge}
                        {labelEl}
                      </span>
                    )}
                  </li>
                </Fragment>
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
  const adminSupabase = createAdminClient();
  const [{ data: slots }, { data: nonWorkingDay }] = await Promise.all([
    supabase.rpc("get_public_slots", {
      p_provider_id: providerId,
      p_service_id: serviceId,
      p_date: selectedDate,
      ...(isAnyWorker ? {} : { p_worker_id: workerParam }),
    }),
    adminSupabase
      .from("time_off")
      .select("reason, is_public_holiday")
      .eq("provider_id", providerId)
      .is("worker_id", null)
      .lte("date_from", selectedDate)
      .gte("date_to", selectedDate)
      .limit(1)
      .maybeSingle(),
  ]);
  const orderedSlots = (slots ?? []).slice().sort((a, b) => {
    const timeCompare =
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();

    if (timeCompare !== 0) {
      return timeCompare;
    }

    return a.worker_name.localeCompare(b.worker_name, "sr-Latn-RS");
  });

  const nonWorkingMessage = nonWorkingDay
    ? nonWorkingDay.reason
      ? `Neradni dan: ${nonWorkingDay.reason}`
      : nonWorkingDay.is_public_holiday
        ? "Neradni dan zbog praznika."
        : "Neradni dan."
    : null;

  return (
    <StepSlot
      slug={slug}
      workerParam={workerParam}
      serviceId={serviceId}
      selectedDate={selectedDate}
      slots={orderedSlots}
      showWorkerName={isAnyWorker}
      nonWorkingMessage={nonWorkingMessage}
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
        Izabrani termin vise nije vazeci. Vrati se i izaberi termin ponovo.
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
