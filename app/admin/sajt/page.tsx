import { SiteEditor } from "./site-editor";
import { ShareSiteButton } from "./share-site-button";
import { getCurrentProvider } from "@/lib/admin/provider";
import { AdminAlertBox } from "@/app/admin/_components/admin-alert-box";
import { AdminBackLink } from "@/app/admin/_components/admin-back-link";

const READINESS_WEEK_DAYS = [
  [1, "ponedeljak"],
  [2, "utorak"],
  [3, "sredu"],
  [4, "cetvrtak"],
  [5, "petak"],
  [6, "subotu"],
  [0, "nedelju"],
] as const;

type ReadinessAlert = {
  key: string;
  title: string;
  description: string;
  href: string;
};

export const metadata = {
  title: "Vaša stranica | zakazi.pro",
};

export default async function AdminSitePage() {
  const { supabase, provider: currentProvider } = await getCurrentProvider();
  const providerBaseSelect =
    "id, name, slug, description, intro_text, address, city, phone, logo_url, cover_url, cover_focal_x, cover_focal_y, primary_color, text_color, font_choice";
  const providerFallbackSelect =
    "id, name, slug, description, intro_text, address, city, phone, logo_url, cover_url, primary_color, text_color, font_choice";
  const providerWithThemeResult = await supabase
    .from("providers")
    .select(`${providerBaseSelect}, site_theme`)
    .eq("id", currentProvider.id)
    .eq("user_id", currentProvider.user_id)
    .maybeSingle();
  const providerResult = providerWithThemeResult.error
    ? await supabase
        .from("providers")
        .select(providerFallbackSelect)
        .eq("id", currentProvider.id)
        .eq("user_id", currentProvider.user_id)
        .maybeSingle()
    : providerWithThemeResult;
  const provider = providerResult.data
    ? {
        ...providerResult.data,
        cover_focal_x:
          "cover_focal_x" in providerResult.data &&
          typeof providerResult.data.cover_focal_x === "number"
            ? providerResult.data.cover_focal_x
            : 50,
        cover_focal_y:
          "cover_focal_y" in providerResult.data &&
          typeof providerResult.data.cover_focal_y === "number"
            ? providerResult.data.cover_focal_y
            : 50,
        site_theme:
          "site_theme" in providerResult.data &&
          typeof providerResult.data.site_theme === "string"
            ? providerResult.data.site_theme
            : "default",
      }
    : null;

  if (!provider) {
    throw new Error("Stranica nije pronadjena.");
  }

  const [
    { data: services },
    { data: workers },
    { data: readinessWorkers },
    { data: readinessServices },
    { data: readinessWorkerServices },
    { data: readinessWorkingHours },
    { data: readinessWorkerSchedules },
    { data: readinessShifts },
  ] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, duration_minutes, price, sort_order")
      .eq("provider_id", currentProvider.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("workers")
      .select("id, name, photo_url, bio, created_at")
      .eq("provider_id", currentProvider.id)
      .eq("is_active", true)
      .is("archived_at", null)
      .order("created_at", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("workers")
      .select("id, name")
      .eq("provider_id", currentProvider.id)
      .eq("is_active", true)
      .is("archived_at", null),
    supabase
      .from("services")
      .select("id, name, is_active")
      .eq("provider_id", currentProvider.id),
    supabase.from("worker_services").select("worker_id, service_id"),
    supabase
      .from("provider_working_hours")
      .select("day_of_week, opens_at, closes_at, is_closed")
      .eq("provider_id", currentProvider.id),
    supabase
      .from("worker_schedule")
      .select("worker_id, day_of_week, shift_id, custom_start_time, custom_end_time"),
    supabase
      .from("shifts")
      .select("id, start_time, end_time")
      .eq("provider_id", currentProvider.id),
  ]);

  const allWorkers = readinessWorkers ?? [];
  const allServices = readinessServices ?? [];
  const allWorkerServices = readinessWorkerServices ?? [];
  const allWorkingHours = readinessWorkingHours ?? [];
  const allWorkerSchedules = readinessWorkerSchedules ?? [];
  const allShifts = readinessShifts ?? [];

  const workerIds = new Set(allWorkers.map((worker) => worker.id));
  const relevantWorkerSchedules = allWorkerSchedules.filter((row) =>
    workerIds.has(row.worker_id),
  );
  const activeServiceIds = new Set(
    allServices.filter((service) => service.is_active).map((service) => service.id),
  );
  const hasWorkerServiceAssignments = allWorkerServices.some(
    (assignment) =>
      workerIds.has(assignment.worker_id) &&
      activeServiceIds.has(assignment.service_id),
  );
  const hasOpenWorkingHours = allWorkingHours.some((row) => row.is_closed === false);
  const hasWorkerSchedule = relevantWorkerSchedules.length > 0;
  const workingHoursByDay = new Map(
    allWorkingHours.map((row) => [row.day_of_week, row]),
  );
  const shiftsById = new Map(allShifts.map((shift) => [shift.id, shift]));
  const serviceAssignmentsByWorker = new Map<string, number>();

  for (const assignment of allWorkerServices) {
    serviceAssignmentsByWorker.set(
      assignment.worker_id,
      (serviceAssignmentsByWorker.get(assignment.worker_id) ?? 0) + 1,
    );
  }

  const workersWithoutServices = allWorkers.filter(
    (worker) => (serviceAssignmentsByWorker.get(worker.id) ?? 0) === 0,
  );
  const servicesWithoutWorkers = allServices.filter((service) => {
    if (!service.is_active) {
      return false;
    }

    return !allWorkerServices.some(
      (assignment) =>
        assignment.service_id === service.id &&
        workerIds.has(assignment.worker_id),
    );
  });
  const invalidScheduleRows = relevantWorkerSchedules.filter((row) => {
    const day = workingHoursByDay.get(row.day_of_week);
    const shift = row.shift_id ? shiftsById.get(row.shift_id) : null;

    if (!day || day.is_closed) {
      return Boolean(shift || row.custom_start_time);
    }

    if (!day.opens_at || !day.closes_at) {
      return false;
    }

    if (shift) {
      return shift.start_time < day.opens_at || shift.end_time > day.closes_at;
    }

    if (row.custom_start_time && row.custom_end_time) {
      return (
        row.custom_start_time < day.opens_at ||
        row.custom_end_time > day.closes_at
      );
    }

    return false;
  });
  const daysWithWorkers = new Set(
    relevantWorkerSchedules
      .filter(
        (row) => row.shift_id || row.custom_start_time,
      )
      .map((row) => row.day_of_week),
  );
  const openDaysWithoutWorkers = READINESS_WEEK_DAYS.flatMap(
    ([dayIndex, dayName]) => {
      const day = workingHoursByDay.get(dayIndex);

      if (
        !day ||
        day.is_closed ||
        !day.opens_at ||
        !day.closes_at ||
        daysWithWorkers.has(dayIndex)
      ) {
        return [];
      }

      return [dayName];
    },
  );

  const readinessAlerts: ReadinessAlert[] = [];

  if (activeServiceIds.size === 0) {
    readinessAlerts.push({
      key: "services",
      title: "Aktivne usluge",
      description:
        "Potrebna je bar jedna aktivna usluga da bi klijent imao sta da zakaze.",
      href: "/admin/usluge",
    });
  }

  if (workerIds.size === 0) {
    readinessAlerts.push({
      key: "workers",
      title: "Dostupni radnici",
      description:
        "Potreban je bar jedan radnik koji moze da prima online termine.",
      href: "/admin/radnici",
    });
  }

  if (workerIds.size > 0 && activeServiceIds.size > 0) {
    if (!hasWorkerServiceAssignments) {
      readinessAlerts.push({
        key: "worker_services",
        title: "Povezane usluge",
        description: "Svaki radnik treba da ima dodeljene usluge koje stvarno radi.",
        href: "/admin/radnici",
      });
    } else {
      if (workersWithoutServices.length > 0) {
        const names = workersWithoutServices.map((worker) => worker.name).join(", ");
        readinessAlerts.push({
          key: "workers_without_services",
          title: "Radnici bez usluga",
          description:
            workersWithoutServices.length === 1
              ? `${names} nema dodeljene usluge.`
              : `${workersWithoutServices.length} radnika nemaju dodeljene usluge: ${names}.`,
          href: "/admin/radnici",
        });
      }

      if (servicesWithoutWorkers.length > 0) {
        readinessAlerts.push({
          key: "services_without_workers",
          title: "Aktivne usluge bez radnika",
          description:
            servicesWithoutWorkers.length === 1
              ? "Jedna aktivna usluga nema nijednog radnika koji je izvodi."
              : `${servicesWithoutWorkers.length} aktivnih usluga nema dodeljene radnike.`,
          href: "/admin/usluge",
        });
      }
    }
  }

  if (!hasOpenWorkingHours) {
    readinessAlerts.push({
      key: "working_hours",
      title: "Radno vreme",
      description: "Ovo je osnovni okvir u kom salon ili studio uopste prima termine.",
      href: "/admin/radno-vreme",
    });
  }

  if (workerIds.size > 0 && hasOpenWorkingHours) {
    if (!hasWorkerSchedule) {
      readinessAlerts.push({
        key: "worker_schedule",
        title: "Raspored radnika",
        description:
          "Radnik mora imati raspored ili smenu da bi se pojavili slobodni termini.",
        href: "/admin/raspored",
      });
    } else {
      if (openDaysWithoutWorkers.length > 0) {
        readinessAlerts.push({
          key: "open_days_without_workers",
          title: "Raspored radnika",
          description:
            openDaysWithoutWorkers.length === 1
              ? `Dodaj radnika za ${openDaysWithoutWorkers[0]} ili zatvori taj dan u radnom vremenu.`
              : `Dodaj radnike za otvorene dane bez pokrica: ${openDaysWithoutWorkers.join(", ")}.`,
          href: "/admin/raspored",
        });
      }

      if (invalidScheduleRows.length > 0) {
        readinessAlerts.push({
          key: "schedule_outside_hours",
          title: "Smene van radnog vremena",
          description:
            invalidScheduleRows.length === 1
              ? "Jedna smena ili raspored je van otvorenog radnog vremena."
              : `${invalidScheduleRows.length} rasporeda ili smena izlaze van otvorenog radnog vremena.`,
          href: "/admin/raspored",
        });
      }
    }
  }

  return (
    <main className="flex flex-1 bg-[radial-gradient(circle_at_top,theme(colors.brand-soft),transparent_42%),linear-gradient(to_bottom,theme(colors.background),theme(colors.background))] px-4 py-8 sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-[92rem] space-y-8">
        <header className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-sm shadow-black/5">
          <div className="flex flex-col gap-5 p-5 sm:p-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                <span>Admin</span>
                <span className="h-1 w-1 rounded-full bg-brand/40" />
                <span>Editor stranice</span>
              </div>
              <div className="space-y-2">
                <AdminBackLink />
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Vaša stranica
                </h1>
                <p className="max-w-xl text-muted-foreground">
                  Uredi javnu stranicu za zakazi.pro/{provider.slug}
                </p>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-border/70 bg-gradient-to-br from-background via-background to-warm-soft p-4 sm:min-w-[18rem]">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Javni link
              </p>
              <p className="mt-2 text-sm text-foreground">
                Podeli svoju stranicu sa klijentima ili je proveri uzivo.
              </p>
              <div className="mt-4">
                <ShareSiteButton
                  slug={provider.slug}
                  providerName={provider.name}
                  className="btn-secondary inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>
          </div>
        </header>

        {readinessAlerts.length ? (
          <section className="space-y-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-destructive">
                Treba popraviti
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ovo direktno utiče na to šta klijent vidi i može da zakaže na vašoj stranici.
              </p>
            </div>
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {readinessAlerts.map((alert) => (
                <AdminAlertBox
                  key={alert.key}
                  title={alert.title}
                  description={alert.description}
                  href={alert.href}
                />
              ))}
            </div>
          </section>
        ) : null}

        <div className="grid gap-8">
          <div className="space-y-8">
            <SiteEditor
              provider={provider}
              services={services ?? []}
              workers={workers ?? []}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
