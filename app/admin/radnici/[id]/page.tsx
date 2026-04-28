import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveWorkerForm } from "../archive-worker-form";
import { WorkerActionForm } from "../worker-action-form";
import { WorkerPhotoUpload } from "../worker-photo-upload";
import {
  WorkerForm,
  WorkerScheduleForm,
  WorkerServicesForm,
} from "../worker-form";
import {
  archiveWorkerAction,
  restoreWorkerAction,
  setWorkerOnlineBookingAction,
  updateWorkerScheduleAction,
  updateWorkerAction,
  updateWorkerServicesAction,
} from "../actions";
import { getCurrentProvider } from "@/lib/admin/provider";

export const metadata = {
  title: "Uredi radnika | zakazi.pro",
};

type WorkerEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function WorkerEditPage({ params }: WorkerEditPageProps) {
  const { id } = await params;
  const { supabase, provider } = await getCurrentProvider();

  const { data: worker } = await supabase
    .from("workers")
    .select("id, name, bio, photo_url, is_active, archived_at")
    .eq("id", id)
    .eq("provider_id", provider.id)
    .maybeSingle();

  if (!worker) {
    notFound();
  }

  const [
    { data: services },
    { data: shifts },
    { data: workerServices },
    { data: workerSchedules },
  ] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, duration_minutes, price, is_active")
      .eq("provider_id", provider.id)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("shifts")
      .select("id, name, start_time, end_time")
      .eq("provider_id", provider.id)
      .order("start_time", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("worker_services")
      .select("service_id")
      .eq("worker_id", worker.id),
    supabase
      .from("worker_schedule")
      .select(
        "id, day_of_week, shift_id, custom_start_time, custom_end_time, custom_break_start, custom_break_end",
      )
      .eq("worker_id", worker.id),
  ]);

  const updateWorker = updateWorkerAction.bind(null, worker.id);
  const updateWorkerServices = updateWorkerServicesAction.bind(null, worker.id);
  const updateWorkerSchedule = updateWorkerScheduleAction.bind(
    null,
    worker.id,
  );
  const archiveWorker = archiveWorkerAction.bind(null, worker.id);
  const restoreWorker = restoreWorkerAction.bind(null, worker.id);
  const enableOnlineBooking = setWorkerOnlineBookingAction.bind(
    null,
    worker.id,
    true,
  );
  const disableOnlineBooking = setWorkerOnlineBookingAction.bind(
    null,
    worker.id,
    false,
  );
  const hasServices = Boolean(workerServices?.length);
  const hasSchedule = Boolean(
    workerSchedules?.some(
      (schedule) => schedule.shift_id || schedule.custom_start_time,
    ),
  );
  const canEnableOnlineBooking = hasServices && hasSchedule;
  const missingItems = [
    !hasServices ? "bar jedna usluga" : null,
    !hasSchedule ? "raspored sa smenom ili custom vremenom" : null,
  ].filter(Boolean);

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
            {worker.name}
          </h1>
        </header>

        <div className="rounded-md border border-border bg-card p-6">
          <WorkerForm
            action={updateWorker}
            submitLabel="Sacuvaj izmene"
            worker={worker}
          />
        </div>

        <section className="rounded-md border border-border bg-card p-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">Status</h2>
            <p className="text-sm text-muted-foreground">
              Online zakazivanje ukljuci tek kada su podaci radnika spremni.
              Fotografija nije obavezna.
            </p>
          </div>

          <div className="mt-5 rounded-md border border-border bg-background p-4">
            <p className="font-medium text-foreground">
              {worker.archived_at
                ? "Radnik je arhiviran."
                : worker.is_active
                  ? "Radnik je ukljucen u online zakazivanje."
                  : canEnableOnlineBooking
                    ? "Radnik je spreman za online zakazivanje."
                    : "Radnik jos nije spreman za online zakazivanje."}
            </p>
            {!worker.archived_at && !worker.is_active && missingItems.length ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Nedostaje: {missingItems.join(", ")}.
              </p>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {!worker.archived_at ? (
              <WorkerActionForm
                action={
                  worker.is_active ? disableOnlineBooking : enableOnlineBooking
                }
                disabled={!worker.is_active && !canEnableOnlineBooking}
                label={
                  worker.is_active
                    ? "Iskljuci iz online zakazivanja"
                    : "Ukljuci u online zakazivanje"
                }
              />
            ) : null}

            {worker.archived_at ? (
              <WorkerActionForm
                action={restoreWorker}
                label="Vrati radnika"
                variant="secondary"
              />
            ) : (
              <ArchiveWorkerForm action={archiveWorker} />
            )}
          </div>
        </section>

        <section className="rounded-md border border-border bg-card p-6">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-foreground">
              Fotografija
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Koristi se u adminu i kasnije na javnoj booking strani.
            </p>
          </div>
          <WorkerPhotoUpload
            initialPhotoUrl={worker.photo_url}
            providerId={provider.id}
            workerId={worker.id}
            workerName={worker.name}
          />
        </section>

        <section className="rounded-md border border-border bg-card p-6">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-foreground">Usluge</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Izaberi usluge koje ovaj radnik moze da prima.
            </p>
          </div>
          <WorkerServicesForm
            action={updateWorkerServices}
            services={services ?? []}
            selectedServiceIds={
              workerServices?.map((service) => service.service_id) ?? []
            }
          />
        </section>

        <section className="rounded-md border border-border bg-card p-6">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-foreground">Raspored</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Izaberi smenu ili unesi posebno radno vreme za dane kada radnik
              prima online zakazivanja.
            </p>
          </div>
          <WorkerScheduleForm
            action={updateWorkerSchedule}
            schedules={workerSchedules ?? []}
            shifts={shifts ?? []}
          />
        </section>
      </section>
    </main>
  );
}
