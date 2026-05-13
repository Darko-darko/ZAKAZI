import Link from "next/link";
import { logoutAction } from "@/app/auth/actions";
import { ManualBookingFilters } from "@/app/admin/_components/manual-booking-filters";
import { getCurrentProvider } from "@/lib/admin/provider";
import { findWorkingHourCoverageGaps } from "@/lib/admin/working-hours-coverage";
import { isSuperAdminEmail } from "@/lib/auth/roles";
import {
  createManualBookingAction,
  resendBookingConfirmationAction,
  updateBookingStatusAction,
} from "./actions";
import {
  StatusActionButton,
  StatusActionCheckbox,
} from "./status-action-button";

export const metadata = {
  title: "Termini | zakazi.pro",
};

type AdminBookingsPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

type BookingRow = {
  id: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
  workers: { name: string } | null;
  services: { name: string } | null;
};

type RiskMarker = {
  count: number;
  lastSeenAt: string;
};

type BookingEmailLogRow = {
  booking_id: string;
  brevo_message_id: string | null;
  created_at: string;
  error_message: string | null;
  recipient_email: string | null;
  sent_at: string | null;
  status: string;
  subject: string | null;
  trigger_source: string;
};

type ManualService = {
  id: string;
  name: string;
  duration_minutes: number;
  price: number | null;
};

type ManualSlot = {
  worker_id: string;
  worker_name: string;
  starts_at: string;
  ends_at: string;
};

type AdminAlert = {
  key: string;
  title: string;
  description: string;
  href: string;
  severity: "critical" | "success";
};

const STATUS_LABELS: Record<string, string> = {
  active: "Zakazani",
  confirmed: "Zakazan",
  completed: "Završen",
  cancelled: "Otkazan",
  noshow: "Nije došao",
  expired: "Istekao",
};

const STATUS_FILTERS = [
  ["active", "Zakazani"],
  ["cancelled", "Otkazani"],
  ["", "Svi statusi"],
] as const;

const WEEK_DAYS = [
  [1, "ponedeljak"],
  [2, "utorak"],
  [3, "sredu"],
  [4, "cetvrtak"],
  [5, "petak"],
  [6, "subotu"],
  [0, "nedelju"],
] as const;

const ADMIN_LINKS = [
  ["/admin/termini", "Termini"],
  ["/admin/radnici", "Radnici"],
  ["/admin/usluge", "Usluge"],
  ["/admin/radno-vreme", "Radno vreme"],
  ["/admin/smene", "Smene"],
  ["/admin/raspored", "Raspored"],
  ["/admin/naplata", "Naplata"],
  ["/admin/sajt", "Vaša stranica"],
] as const;

const BOOKINGS_OVERVIEW_ID = "dnevni-pregled";
const MANUAL_ADD_ID = "rucno-dodaj-termin";

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

function dayBounds(date: string) {
  return {
    from: `${date}T00:00:00+01:00`,
    to: `${date}T23:59:59+01:00`,
  };
}

function shiftDate(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("sr-Latn-RS", {
    timeZone: "Europe/Belgrade",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatSelectedDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Intl.DateTimeFormat("sr-Latn-RS", {
    timeZone: "Europe/Belgrade",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatDateTimeCompact(value: string) {
  return new Intl.DateTimeFormat("sr-Latn-RS", {
    timeZone: "Europe/Belgrade",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

function formatPlanStatus(status: string) {
  if (!status) {
    return "Plan nije postavljen";
  }

  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function StatusMarker({ status }: { status: string }) {
  return (
    <span className="inline-flex rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-foreground">
      {statusLabel(status)}
    </span>
  );
}

function isPast(value: string) {
  return new Date(value).getTime() < Date.now();
}

function buildBookingsUrl(params: {
  date: string;
  worker?: string;
  status?: string;
  manual?: boolean;
  manualDate?: string;
  manualWorker?: string;
  manualService?: string;
  manualSlot?: string;
  manualError?: string;
  anchor?: string;
}) {
  const search = new URLSearchParams();
  search.set("date", params.date);

  if (params.worker) {
    search.set("worker", params.worker);
  }

  if (params.status !== undefined) {
    search.set("status", params.status);
  }

  if (params.manual) {
    search.set("manual", "1");
  }

  if (params.manualDate) {
    search.set("manual_date", params.manualDate);
  }

  if (params.manualWorker) {
    search.set("manual_worker", params.manualWorker);
  }

  if (params.manualService) {
    search.set("manual_service", params.manualService);
  }

  if (params.manualSlot) {
    search.set("manual_slot", params.manualSlot);
  }

  if (params.manualError) {
    search.set("manual_error", params.manualError);
  }

  return `/admin/termini?${search.toString()}${params.anchor ? `#${params.anchor}` : ""}`;
}

function buildFilterUrl(params: {
  date: string;
  worker?: string;
  status?: string;
}) {
  return buildBookingsUrl({
    date: params.date,
    worker: params.worker,
    status: params.status,
    anchor: BOOKINGS_OVERVIEW_ID,
  });
}

function setupProgressWidth(completed: number, total: number) {
  if (total <= 0) {
    return "0%";
  }

  return `${Math.round((completed / total) * 100)}%`;
}

function alertTone(severity: AdminAlert["severity"]) {
  if (severity === "critical") {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }

  return "border-emerald-300/40 bg-emerald-50 text-emerald-800";
}

function alertBadge(severity: AdminAlert["severity"]) {
  if (severity === "critical") {
    return "Hitno";
  }

  return "OK";
}

function alertsHeadline(count: number) {
  if (count === 1) {
    return "Jedna stavka trazi paznju";
  }

  if (count >= 2 && count <= 4) {
    return `${count} stavke traze paznju`;
  }

  return `${count} stavki trazi paznju`;
}

export default async function AdminBookingsPage({
  searchParams,
}: AdminBookingsPageProps) {
  const query = await searchParams;
  const { supabase, provider, user } = await getCurrentProvider();
  const isSuperAdmin = isSuperAdminEmail(user.email);
  const { data: currentAgent } = await supabase
    .from("agents")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  const isAgent = Boolean(currentAgent);
  const today = todayInBelgrade();
  const tomorrow = shiftDate(today, 1);
  const selectedDate = firstParam(query.date) ?? today;
  const selectedWorker = firstParam(query.worker) ?? "";
  const selectedStatus = firstParam(query.status) ?? "active";
  const manualOpen = firstParam(query.manual) === "1";
  const manualDate = firstParam(query.manual_date) ?? selectedDate;
  const manualWorker = firstParam(query.manual_worker) ?? "";
  const manualService = firstParam(query.manual_service) ?? "";
  const manualSlot = firstParam(query.manual_slot) ?? "";
  const manualError = firstParam(query.manual_error) ?? "";
  const bounds = dayBounds(selectedDate);
  const todayBounds = dayBounds(today);
  const tomorrowBounds = dayBounds(tomorrow);

  const [
    { data: workers },
    { data: services },
    { data: workerServices },
    { data: workingHours },
    { data: workerSchedules },
    { data: shifts },
    { count: todayActiveCount },
    { count: tomorrowActiveCount },
  ] = await Promise.all([
    supabase
      .from("workers")
      .select("id, name, is_active")
      .eq("provider_id", provider.id)
      .is("archived_at", null)
      .order("created_at"),
    supabase
      .from("services")
      .select("id, is_active")
      .eq("provider_id", provider.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("worker_services")
      .select("worker_id, service_id"),
    supabase
      .from("provider_working_hours")
      .select("id, day_of_week, opens_at, closes_at, is_closed")
      .eq("provider_id", provider.id),
    supabase
      .from("worker_schedule")
      .select("id, worker_id, day_of_week, shift_id, custom_start_time, custom_end_time"),
    supabase
      .from("shifts")
      .select("id, name, start_time, end_time")
      .eq("provider_id", provider.id),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("provider_id", provider.id)
      .gte("starts_at", todayBounds.from)
      .lte("starts_at", todayBounds.to)
      .in("status", ["pending", "confirmed", "noshow"]),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("provider_id", provider.id)
      .gte("starts_at", tomorrowBounds.from)
      .lte("starts_at", tomorrowBounds.to)
      .in("status", ["pending", "confirmed", "noshow"]),
  ]);

  const onlineWorkers = (workers ?? []).filter((worker) => worker.is_active);
  const onlineWorkerIds = new Set(onlineWorkers.map((worker) => worker.id));
  const relevantWorkerSchedules = (workerSchedules ?? []).filter((row) =>
    onlineWorkerIds.has(row.worker_id),
  );
  const serviceIds = new Set(
    (services ?? [])
      .filter((service) => service.is_active)
      .map((service) => service.id),
  );
  const hasWorkerServiceAssignments = (workerServices ?? []).some(
    (assignment) =>
      onlineWorkerIds.has(assignment.worker_id) &&
      serviceIds.has(assignment.service_id),
  );
  const hasOpenWorkingHours = (workingHours ?? []).some(
    (row) => row.is_closed === false,
  );
  const hasWorkerSchedule = relevantWorkerSchedules.length > 0;
  const workingHoursByDay = new Map(
    (workingHours ?? []).map((row) => [row.day_of_week, row]),
  );
  const shiftsById = new Map((shifts ?? []).map((shift) => [shift.id, shift]));
  const serviceAssignmentsByWorker = new Map<string, number>();

  for (const assignment of workerServices ?? []) {
    if (!onlineWorkerIds.has(assignment.worker_id)) {
      continue;
    }

    serviceAssignmentsByWorker.set(
      assignment.worker_id,
      (serviceAssignmentsByWorker.get(assignment.worker_id) ?? 0) + 1,
    );
  }

  const workersWithoutServices = onlineWorkers.filter(
    (worker) => (serviceAssignmentsByWorker.get(worker.id) ?? 0) === 0,
  );
  const servicesWithoutWorkers = (services ?? []).filter((service) => {
    if (!service.is_active) {
      return false;
    }

    return !(workerServices ?? []).some((assignment) => assignment.service_id === service.id);
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
  const uncoveredWorkingHourGaps = findWorkingHourCoverageGaps({
    schedules: relevantWorkerSchedules,
    workingHours: workingHours ?? [],
    shifts: shifts ?? [],
  });
  const uncoveredWorkingDays = new Set(
    uncoveredWorkingHourGaps.map((gap) => gap.dayOfWeek),
  );
  const daysWithWorkers = new Set(
    relevantWorkerSchedules
      .filter((row) => row.shift_id || row.custom_start_time)
      .map((row) => row.day_of_week),
  );
  const openDaysWithoutWorkers = WEEK_DAYS.flatMap(([dayIndex, dayName]) => {
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
  });
  const setupCompleted = [
    serviceIds.size > 0,
    onlineWorkerIds.size > 0,
    hasWorkerServiceAssignments &&
      workersWithoutServices.length === 0 &&
      servicesWithoutWorkers.length === 0,
    hasOpenWorkingHours,
    hasWorkerSchedule &&
      openDaysWithoutWorkers.length === 0 &&
      invalidScheduleRows.length === 0 &&
      uncoveredWorkingDays.size === 0,
  ];
  const totalSetupSteps = setupCompleted.length;
  const completedSetupSteps = setupCompleted.filter(Boolean).length;
  const bookingSetupReady = completedSetupSteps === totalSetupSteps;
  const alerts: AdminAlert[] = [];

  if (serviceIds.size === 0) {
    alerts.push({
      key: "services",
      title: "Aktivne usluge",
      description: "Potrebna je bar jedna aktivna usluga da bi klijent imao sta da zakaze.",
      href: "/admin/usluge",
      severity: "critical",
    });
  }

  if (onlineWorkerIds.size === 0) {
    alerts.push({
      key: "workers",
      title: "Dostupni radnici",
      description: "Potreban je bar jedan radnik koji moze da prima online termine.",
      href: "/admin/radnici",
      severity: "critical",
    });
  }

  if (onlineWorkerIds.size > 0 && serviceIds.size > 0) {
    if (!hasWorkerServiceAssignments) {
      alerts.push({
        key: "worker_services",
        title: "Povezane usluge",
        description: "Svaki radnik treba da ima dodeljene usluge koje stvarno radi.",
        href: "/admin/radnici",
        severity: "critical",
      });
    } else {
      if (workersWithoutServices.length > 0) {
        const names = workersWithoutServices.map((worker) => worker.name).join(", ");
        alerts.push({
          key: "workers_without_services",
          title: "Radnici bez usluga",
          description:
            workersWithoutServices.length === 1
              ? `${names} nema dodeljene usluge.`
              : `${workersWithoutServices.length} radnika nemaju dodeljene usluge: ${names}.`,
          href: "/admin/radnici",
          severity: "critical",
        });
      }

      if (servicesWithoutWorkers.length > 0) {
        alerts.push({
          key: "services_without_workers",
          title: "Aktivne usluge bez radnika",
          description:
            servicesWithoutWorkers.length === 1
              ? "Jedna aktivna usluga nema nijednog radnika koji je izvodi."
              : `${servicesWithoutWorkers.length} aktivnih usluga nema dodeljene radnike.`,
          href: "/admin/usluge",
          severity: "critical",
        });
      }
    }
  }

  if (!hasOpenWorkingHours) {
    alerts.push({
      key: "working_hours",
      title: "Radno vreme",
      description: "Ovo je osnovni okvir u kom salon ili studio uopste prima termine.",
      href: "/admin/radno-vreme",
      severity: "critical",
    });
  }

  if (onlineWorkerIds.size > 0 && hasOpenWorkingHours) {
    if (!hasWorkerSchedule) {
      alerts.push({
        key: "worker_schedule",
        title: "Raspored radnika",
        description: "Radnik mora imati raspored ili smenu da bi se pojavili slobodni termini.",
        href: "/admin/raspored",
        severity: "critical",
      });
    } else {
      if (openDaysWithoutWorkers.length > 0) {
        alerts.push({
          key: "open_days_without_workers",
          title: "Raspored radnika",
          description:
            openDaysWithoutWorkers.length === 1
              ? `Dodaj radnika za ${openDaysWithoutWorkers[0]} ili zatvori taj dan u radnom vremenu.`
              : `Dodaj radnike za otvorene dane bez pokrica: ${openDaysWithoutWorkers.join(", ")}.`,
          href: "/admin/raspored",
          severity: "critical",
        });
      }

      if (invalidScheduleRows.length > 0) {
        alerts.push({
          key: "schedule_outside_hours",
          title: "Smene van radnog vremena",
          description:
            invalidScheduleRows.length === 1
              ? "Jedna smena ili raspored je van otvorenog radnog vremena."
              : `${invalidScheduleRows.length} rasporeda ili smena izlaze van otvorenog radnog vremena.`,
          href: "/admin/raspored",
          severity: "critical",
        });
      }

      if (uncoveredWorkingDays.size > 0) {
        alerts.push({
          key: "working_hours_uncovered",
          title: "Nepokriveni sati",
          description:
            uncoveredWorkingDays.size === 1
              ? "Otvoreno radno vreme ima sate bez ijednog radnika u rasporedu."
              : `${uncoveredWorkingDays.size} otvorena dana imaju sate bez ijednog radnika u rasporedu.`,
          href: "/admin/raspored",
          severity: "critical",
        });
      }
    }
  }

  if (alerts.length === 0) {
    alerts.push({
      key: "ready",
      title: "Online zakazivanje je spremno",
      description:
        "Javna strana trenutno ima osnovne podatke za slobodne termine i rucni unos.",
      href: "/admin/sajt",
      severity: "success",
    });
  }

  const primaryAlerts = alerts.filter((alert) => alert.severity !== "success");
  const hasHealthyStatusOnly =
    primaryAlerts.length === 0 && alerts.some((alert) => alert.severity === "success");

  let bookingsQuery = supabase
    .from("bookings")
    .select(
      "id, client_name, client_phone, client_email, starts_at, ends_at, status, notes, workers(name), services(name)",
    )
    .eq("provider_id", provider.id)
    .gte("starts_at", bounds.from)
    .lte("starts_at", bounds.to)
    .order("starts_at", { ascending: true });

  if (selectedWorker) {
    bookingsQuery = bookingsQuery.eq("worker_id", selectedWorker);
  }

  if (selectedStatus === "active") {
    bookingsQuery = bookingsQuery.in("status", ["pending", "confirmed", "noshow"]);
  } else if (!selectedStatus) {
    bookingsQuery = bookingsQuery.neq("status", "expired");
  } else if (selectedStatus) {
    bookingsQuery = bookingsQuery.eq("status", selectedStatus);
  }

  let manualServices: ManualService[] = [];
  if (manualOpen && manualWorker) {
    const { data } = await supabase.rpc("get_public_services", {
      p_provider_id: provider.id,
      p_worker_id: manualWorker,
    });

    manualServices = (data ?? []) as ManualService[];
  }

  let manualSlots: ManualSlot[] = [];
  if (manualOpen && manualWorker && manualService) {
    const { data } = await supabase.rpc("get_public_slots", {
      p_provider_id: provider.id,
      p_service_id: manualService,
      p_date: manualDate,
      p_worker_id: manualWorker,
    });

    manualSlots = ((data ?? []) as ManualSlot[]).slice().sort((a, b) => {
      return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
    });
  }

  const { data: bookings } = await bookingsQuery;
  const rows = (bookings ?? []) as BookingRow[];
  const bookingIds = rows.map((booking) => booking.id);
  const { data: bookingEmailLogs, error: bookingEmailLogsError } = bookingIds.length
    ? await supabase
        .from("booking_email_logs")
        .select(
          "booking_id, brevo_message_id, created_at, error_message, recipient_email, sent_at, status, subject, trigger_source",
        )
        .eq("provider_id", provider.id)
        .eq("email_type", "confirmation_client")
        .in("booking_id", bookingIds)
        .order("created_at", { ascending: false })
    : { data: [] as BookingEmailLogRow[], error: null };
  const phones = Array.from(
    new Set(rows.map((booking) => booking.client_phone).filter(Boolean)),
  );
  const emails = Array.from(
    new Set(
      rows
        .map((booking) => booking.client_email)
        .filter((email): email is string => Boolean(email)),
    ),
  );
  const [phoneNoShows, emailNoShows] = await Promise.all([
    phones.length
      ? supabase
          .from("bookings")
          .select("client_phone, starts_at")
          .eq("provider_id", provider.id)
          .eq("status", "noshow")
          .in("client_phone", phones)
      : Promise.resolve({ data: [] }),
    emails.length
      ? supabase
          .from("bookings")
          .select("client_email, starts_at")
          .eq("provider_id", provider.id)
          .eq("status", "noshow")
          .in("client_email", emails)
      : Promise.resolve({ data: [] }),
  ]);
  const riskByPhone = new Map<string, RiskMarker>();
  const riskByEmail = new Map<string, RiskMarker>();

  for (const item of phoneNoShows.data ?? []) {
    const current = riskByPhone.get(item.client_phone);
    riskByPhone.set(item.client_phone, {
      count: (current?.count ?? 0) + 1,
      lastSeenAt:
        !current || item.starts_at > current.lastSeenAt
          ? item.starts_at
          : current.lastSeenAt,
    });
  }

  for (const item of emailNoShows.data ?? []) {
    if (!item.client_email) {
      continue;
    }

    const current = riskByEmail.get(item.client_email);
    riskByEmail.set(item.client_email, {
      count: (current?.count ?? 0) + 1,
      lastSeenAt:
        !current || item.starts_at > current.lastSeenAt
          ? item.starts_at
          : current.lastSeenAt,
    });
  }

  const latestClientEmailByBooking = new Map<string, BookingEmailLogRow>();

  for (const log of (bookingEmailLogs ?? []) as BookingEmailLogRow[]) {
    if (!latestClientEmailByBooking.has(log.booking_id)) {
      latestClientEmailByBooking.set(log.booking_id, log);
    }
  }

  const selectedManualWorker = workers?.find((worker) => worker.id === manualWorker);
  const selectedManualService = manualServices.find(
    (service) => service.id === manualService,
  );
  const selectedManualSlot = manualSlots.find((slot) => slot.starts_at === manualSlot);
  const manualReadyCount = [
    manualDate ? 1 : 0,
    manualWorker ? 1 : 0,
    manualService ? 1 : 0,
    manualSlot ? 1 : 0,
  ].filter(Boolean).length;

  const currentPath = buildFilterUrl({
    date: selectedDate,
    worker: selectedWorker,
    status: selectedStatus,
  });
  const filterFormKey = `${selectedDate}:${selectedWorker}:${selectedStatus}`;
  const manualPanelUrl = buildBookingsUrl({
    date: selectedDate,
    worker: selectedWorker,
    status: selectedStatus,
    manual: true,
    manualDate,
    manualWorker,
    manualService,
    manualSlot,
    anchor: MANUAL_ADD_ID,
  });
  const manualCloseUrl = buildBookingsUrl({
    date: selectedDate,
    worker: selectedWorker,
    status: selectedStatus,
    anchor: BOOKINGS_OVERVIEW_ID,
  });

  return (
    <main className="flex flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-6xl space-y-6">
        <header className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Admin panel
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  Termini
                </h1>
                <span className="inline-flex min-h-8 items-center rounded-full border border-primary/15 bg-primary/8 px-3 text-xs font-semibold text-primary">
                  Plan: {formatPlanStatus(provider.plan_status)}
                </span>
              </div>
              <p className="mt-2 text-muted-foreground">
                {provider.name} · zakazi.pro/{provider.slug}
                {provider.city ? ` · ${provider.city}` : ""}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pregled ko je zakazao, kada, kod koga i za koju uslugu.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 self-start">
              {isSuperAdmin ? (
                <Link
                  href="/superadmin"
                  className="btn-primary inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold text-primary-foreground"
                >
                  Superadmin panel
                </Link>
              ) : null}
              {isAgent ? (
                <Link
                  href="/agent"
                  className="btn-secondary inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold text-foreground"
                >
                  Partner panel
                </Link>
              ) : null}
              <form action={logoutAction}>
                <button className="btn-secondary inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold text-foreground">
                  Odjavi se
                </button>
              </form>
            </div>
          </div>
        </header>

        <nav className="rounded-2xl border border-border/70 bg-muted/55 p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {ADMIN_LINKS.map(([href, label]) => {
            const isActive = href === "/admin/termini";

            return (
              <Link
                key={href}
                href={href}
                className={
                  isActive
                    ? "inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-sm"
                    : "inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border/80 bg-background/95 px-3.5 py-2 text-sm font-medium text-foreground transition hover:border-primary/30 hover:bg-background"
                }
              >
                {label}
              </Link>
            );
          })}
          </div>
        </nav>

        <section className="space-y-3">
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Kontrola sistema
                </p>
                <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground">
                  {hasHealthyStatusOnly
                    ? "Sve kljucne stvari su pod kontrolom"
                    : alertsHeadline(primaryAlerts.length)}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Kratak pregled onoga sto moze da blokira online zakazivanje.
                </p>
              </div>
              <div className="min-w-[220px] rounded-2xl border border-primary/15 bg-primary/6 p-4">
                <p className="text-sm font-semibold text-primary">
                  Spremnost: {completedSetupSteps}/{totalSetupSteps}
                </p>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-primary/10">
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{ width: setupProgressWidth(completedSetupSteps, totalSetupSteps) }}
                  />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {bookingSetupReady
                    ? "Osnovna postavka je spremna i javna strana radi bez prepreka."
                    : "Dopuni kljucne stavke da bi javna strana sigurno nudila slobodne termine."}
                </p>
              </div>
            </div>

            {hasHealthyStatusOnly ? (
              <div className="rounded-xl border border-emerald-300/40 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Online zakazivanje je spremno i trenutno nema kriticnih upozorenja.
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-3">
                {primaryAlerts.map((alert) => (
                  <Link
                    key={alert.key}
                    href={alert.href}
                    className={`rounded-xl border px-4 py-3 transition hover:opacity-90 ${alertTone(alert.severity)}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{alert.title}</p>
                        <p className="mt-1 text-sm opacity-90">{alert.description}</p>
                      </div>
                      <span className="rounded-full border border-current/20 px-2 py-0.5 text-[11px] font-semibold">
                        {alertBadge(alert.severity)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2">
          <Link
            href={buildFilterUrl({ date: today, status: "active" })}
            className="inline-flex min-h-12 w-full items-center justify-between rounded-xl border border-border/80 bg-warm-soft px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:border-warm/40"
          >
            <span>Danas</span>
            <span className="rounded-full border border-warm/30 bg-background px-2 py-0.5 text-xs font-semibold text-foreground">
              {todayActiveCount ?? 0}
            </span>
          </Link>
          <Link
            href={buildFilterUrl({ date: tomorrow, status: "active" })}
            className="inline-flex min-h-12 w-full items-center justify-between rounded-xl border border-border/80 bg-brand-soft px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:border-brand/35"
          >
            <span>Sutra</span>
            <span className="rounded-full border border-brand/25 bg-background px-2 py-0.5 text-xs font-semibold text-foreground">
              {tomorrowActiveCount ?? 0}
            </span>
          </Link>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Filtriraj pregled
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Fokus ostaje na dnevnom radu: datum, radnik i status u dva klika.
          </p>
        </div>

        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div id={BOOKINGS_OVERVIEW_ID}>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Dnevni pregled
            </h2>
            <p className="mt-1 text-muted-foreground">
              {formatSelectedDate(selectedDate)} · prikaz za izabrani datum i
              filtere.
            </p>
          </div>
          {manualOpen ? (
            <Link
              href={manualCloseUrl}
              className="inline-flex min-h-11 items-center justify-center gap-3 self-start rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary/15 sm:self-auto"
            >
              <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                ×
              </span>
              <span>Zatvori ručni unos</span>
            </Link>
          ) : (
            <Link
              href={manualPanelUrl}
              className="inline-flex min-h-11 items-center justify-center gap-3 self-start rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary/15 sm:self-auto"
            >
              <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                +
              </span>
              <span>Ručno dodaj termin</span>
            </Link>
          )}
        </header>

        {manualOpen ? (
          <section
            id={MANUAL_ADD_ID}
            className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Rucni unos termina
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Izaberi radnika, uslugu i slobodan termin, pa unesi podatke
                  musterije.
                </p>
              </div>
              <div className="rounded-xl border border-primary/15 bg-primary/6 px-4 py-3 text-sm">
                <p className="font-semibold text-primary">Tok unosa</p>
                <p className="mt-1 text-muted-foreground">
                  Korak {Math.min(manualReadyCount + 1, 4)}/4 · datum, radnik,
                  usluga, slobodan slot.
                </p>
              </div>
            </div>

            <ManualBookingFilters
              currentDate={selectedDate}
              currentWorker={selectedWorker}
              currentStatus={selectedStatus}
              manualDate={manualDate}
              manualWorker={manualWorker}
              manualService={manualService}
              services={manualServices}
              workers={workers ?? []}
            />

            {manualError ? (
              <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                {manualError}
              </div>
            ) : null}

            {manualWorker && manualService ? (
              <div className="mt-5 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Slobodni termini
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedManualWorker?.name} · {selectedManualService?.name} ·{" "}
                    {formatSelectedDate(manualDate)}
                  </p>
                </div>

                {manualSlots.length ? (
                  <div className="flex flex-wrap gap-2">
                    {manualSlots.map((slot) => {
                      const isActive = slot.starts_at === manualSlot;

                      return (
                        <Link
                          key={slot.starts_at}
                          href={buildBookingsUrl({
                            date: selectedDate,
                            worker: selectedWorker,
                            status: selectedStatus,
                            manual: true,
                            manualDate,
                            manualWorker,
                            manualService,
                            manualSlot: slot.starts_at,
                            anchor: MANUAL_ADD_ID,
                          })}
                          className={
                            isActive
                              ? "btn-primary inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-primary-foreground"
                              : "btn-secondary inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-foreground"
                          }
                        >
                          {formatTime(slot.starts_at)}
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-md border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                    Nema slobodnih termina za izabrani dan, radnika i uslugu.
                  </div>
                )}
              </div>
            ) : null}

            {selectedManualSlot && selectedManualService ? (
              <form action={createManualBookingAction} className="mt-5 space-y-4">
                <input type="hidden" name="current_date" value={selectedDate} />
                <input type="hidden" name="current_worker" value={selectedWorker} />
                <input type="hidden" name="current_status" value={selectedStatus} />
                <input type="hidden" name="manual_date" value={manualDate} />
                <input type="hidden" name="worker_id" value={manualWorker} />
                <input type="hidden" name="service_id" value={manualService} />
                <input type="hidden" name="starts_at" value={manualSlot} />

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
                  <div className="rounded-lg border border-border/70 bg-background p-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      Novi termin
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {selectedManualWorker?.name} · {selectedManualService.name}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatSelectedDate(manualDate)} · {formatTime(manualSlot)} do{" "}
                      {formatTime(selectedManualSlot.ends_at)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-brand/20 bg-brand-soft px-4 py-4">
                    <p className="text-sm font-semibold text-brand">
                      Spremno za unos klijenta
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      Slot ostaje zakljucan u formi ispod da admin ne izgubi izbor.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2 sm:col-span-2">
                    <span className="text-sm font-medium text-foreground">
                      Ime i prezime
                    </span>
                    <input
                      name="client_name"
                      required
                      className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">
                      Telefon
                    </span>
                    <input
                      name="client_phone"
                      required
                      inputMode="tel"
                      className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">
                      Email
                    </span>
                    <input
                      type="email"
                      name="client_email"
                      required
                      className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                    />
                  </label>
                  <label className="space-y-2 sm:col-span-2">
                    <span className="text-sm font-medium text-foreground">
                      Napomena <span className="text-muted-foreground">(opciono)</span>
                    </span>
                    <textarea
                      name="notes"
                      rows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                    />
                  </label>
                </div>

                <button className="btn-primary inline-flex min-h-11 items-center justify-center rounded-md px-4 font-semibold text-primary-foreground">
                  Sačuvaj termin
                </button>
              </form>
            ) : null}
          </section>
        ) : null}

        <form
          key={filterFormKey}
          action="/admin/termini"
          className="grid gap-3 rounded-md border border-border bg-card p-4 sm:grid-cols-[1fr_1fr_1fr_auto]"
        >
          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">Datum</span>
            <input
              type="date"
              name="date"
              defaultValue={selectedDate}
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">Radnik</span>
            <select
              name="worker"
              defaultValue={selectedWorker}
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            >
              <option value="">Svi radnici</option>
              {workers?.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">Status</span>
            <select
              name="status"
              defaultValue={selectedStatus}
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            >
              {STATUS_FILTERS.map(([status, label]) => (
                <option key={status} value={status}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-primary min-h-11 self-end rounded-md px-4 font-semibold text-primary-foreground">
            Prikaži
          </button>
        </form>

        <div className="space-y-3">
          {bookingEmailLogsError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              Evidencija booking emailova trenutno nije dostupna: {bookingEmailLogsError.message}
            </div>
          ) : null}
          {rows.length ? (
            rows.map((booking) => {
              const phoneRisk = riskByPhone.get(booking.client_phone);
              const emailRisk = booking.client_email
                ? riskByEmail.get(booking.client_email)
                : undefined;
              const risk =
                phoneRisk && emailRisk
                  ? {
                      count: Math.max(phoneRisk.count, emailRisk.count),
                      lastSeenAt:
                        phoneRisk.lastSeenAt > emailRisk.lastSeenAt
                          ? phoneRisk.lastSeenAt
                          : emailRisk.lastSeenAt,
                    }
                  : phoneRisk ?? emailRisk;
              const showRisk =
                booking.status === "confirmed" &&
                risk &&
                risk.lastSeenAt < booking.starts_at;
              const canMarkNoShow =
                booking.status === "confirmed" && isPast(booking.starts_at);
              const canCancel =
                booking.status === "confirmed" && !isPast(booking.starts_at);
              const markNoShow = updateBookingStatusAction.bind(
                null,
                booking.id,
                "noshow",
              );
              const cancelBooking = updateBookingStatusAction.bind(
                null,
                booking.id,
                "cancelled",
              );
              const undoNoShow = updateBookingStatusAction.bind(
                null,
                booking.id,
                "confirmed",
              );
              const resendConfirmation = resendBookingConfirmationAction.bind(
                null,
                booking.id,
              );
              const latestClientEmail = latestClientEmailByBooking.get(booking.id);
              const emailStatusTone =
                latestClientEmail?.status === "sent"
                  ? "text-emerald-700"
                  : latestClientEmail?.status === "failed"
                    ? "text-destructive"
                    : "text-muted-foreground";

              return (
                <article
                  key={booking.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="grid gap-4 lg:grid-cols-[8rem_minmax(0,1fr)_12rem_10rem]">
                    <div className="rounded-lg border border-border/70 bg-background px-3 py-3">
                      <p className="text-3xl font-bold leading-none text-foreground">
                        {formatTime(booking.starts_at)}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        do {formatTime(booking.ends_at)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">
                        {booking.client_name}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {booking.client_phone}
                        {booking.client_email ? ` · ${booking.client_email}` : ""}
                      </p>
                      {showRisk ? (
                        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                          Ranije nije došao {risk.count}x. Proveri telefonom pre
                          termina.
                        </p>
                      ) : null}
                      {booking.notes ? (
                        <p className="mt-3 text-sm text-muted-foreground">
                          {booking.notes}
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-lg bg-background/70 px-3 py-3">
                      <p className="text-sm font-semibold text-foreground">
                        {booking.workers?.name ?? "Radnik nije pronađen"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {booking.services?.name ?? "Usluga nije pronađena"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <StatusMarker status={booking.status} />
                      {canMarkNoShow ? (
                        <form action={markNoShow}>
                          <input
                            type="hidden"
                            name="return_to"
                            value={currentPath}
                          />
                          <StatusActionCheckbox
                            confirmMessage="Označiti da klijent nije došao na ovaj termin?"
                            label="Nije došao"
                          />
                        </form>
                      ) : null}
                      {booking.status === "noshow" ? (
                        <form action={undoNoShow}>
                          <input
                            type="hidden"
                            name="return_to"
                            value={currentPath}
                          />
                          <StatusActionCheckbox
                            checked
                            confirmMessage="Vratiti ovaj termin u zakazane?"
                            label="Nije došao"
                          />
                        </form>
                      ) : null}
                      {canCancel ? (
                        <form action={cancelBooking}>
                          <input
                            type="hidden"
                            name="return_to"
                            value={currentPath}
                          />
                          <StatusActionButton confirmMessage="Otkazati ovaj termin?">
                            Otkaži
                          </StatusActionButton>
                        </form>
                      ) : null}
                      <div className="rounded-md border border-border/70 bg-background/80 px-2.5 py-2 text-[11px] leading-5">
                        <p className={`font-semibold ${emailStatusTone}`}>
                          {latestClientEmail?.status === "sent"
                            ? `Potvrda je poslata ${formatDateTimeCompact(latestClientEmail.sent_at ?? latestClientEmail.created_at)}`
                            : latestClientEmail?.status === "failed"
                              ? `Potvrda nije poslata ${formatDateTimeCompact(latestClientEmail.created_at)}`
                              : latestClientEmail?.status === "skipped"
                                ? `Slanje potvrde je preskoceno ${formatDateTimeCompact(latestClientEmail.created_at)}`
                                : "Jos nema potvrde o slanju emaila"}
                        </p>
                        {latestClientEmail?.recipient_email ? (
                          <p className="text-muted-foreground">
                            Primalac: {latestClientEmail.recipient_email}
                          </p>
                        ) : null}
                        {latestClientEmail?.error_message ? (
                          <p className="text-destructive">
                            Slanje nije uspelo. Probaj ponovo.
                          </p>
                        ) : null}
                        <form action={resendConfirmation} className="mt-2">
                          <input
                            type="hidden"
                            name="return_to"
                            value={currentPath}
                          />
                          <StatusActionButton confirmMessage="Ponovo poslati potvrdu termina ovom klijentu?">
                            Re-send potvrdu
                          </StatusActionButton>
                        </form>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
              Nema termina za izabrane filtere.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
