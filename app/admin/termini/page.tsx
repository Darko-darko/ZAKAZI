import Link from "next/link";
import { logoutAction } from "@/app/auth/actions";
import { getCurrentProvider } from "@/lib/admin/provider";
import { updateBookingStatusAction } from "./actions";
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

const STATUS_LABELS: Record<string, string> = {
  active: "Zakazani",
  confirmed: "Zakazan",
  completed: "Zavrsen",
  cancelled: "Otkazan",
  noshow: "Nije došao",
  expired: "Istekao",
};

const STATUS_FILTERS = [
  ["active", "Zakazani"],
  ["cancelled", "Otkazani"],
  ["", "Svi statusi"],
] as const;

const ADMIN_LINKS = [
  ["/admin/termini", "Termini"],
  ["/admin/radnici", "Radnici"],
  ["/admin/usluge", "Usluge"],
  ["/admin/smene", "Smene"],
  ["/admin/radno-vreme", "Radno vreme"],
  ["/admin/raspored", "Raspored"],
  ["/admin/sajt", "Mini sajt"],
] as const;

const BOOKINGS_OVERVIEW_ID = "dnevni-pregled";

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

function buildFilterUrl(params: {
  date: string;
  worker?: string;
  status?: string;
}) {
  const search = new URLSearchParams();
  search.set("date", params.date);

  if (params.worker) {
    search.set("worker", params.worker);
  }

  if (params.status !== undefined) {
    search.set("status", params.status);
  }

  return `/admin/termini?${search.toString()}#${BOOKINGS_OVERVIEW_ID}`;
}

export default async function AdminBookingsPage({
  searchParams,
}: AdminBookingsPageProps) {
  const query = await searchParams;
  const { supabase, provider } = await getCurrentProvider();
  const today = todayInBelgrade();
  const tomorrow = shiftDate(today, 1);
  const selectedDate = firstParam(query.date) ?? today;
  const selectedWorker = firstParam(query.worker) ?? "";
  const selectedStatus = firstParam(query.status) ?? "active";
  const bounds = dayBounds(selectedDate);
  const todayBounds = dayBounds(today);
  const tomorrowBounds = dayBounds(tomorrow);

  const [
    { data: workers },
    { count: todayActiveCount },
    { count: todayCancelledCount },
    { count: todayAllCount },
    { count: tomorrowActiveCount },
  ] = await Promise.all([
    supabase
      .from("workers")
      .select("id, name")
      .eq("provider_id", provider.id)
      .is("archived_at", null)
      .order("created_at"),
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
      .gte("starts_at", todayBounds.from)
      .lte("starts_at", todayBounds.to)
      .eq("status", "cancelled"),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("provider_id", provider.id)
      .gte("starts_at", todayBounds.from)
      .lte("starts_at", todayBounds.to)
      .neq("status", "expired"),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("provider_id", provider.id)
      .gte("starts_at", tomorrowBounds.from)
      .lte("starts_at", tomorrowBounds.to)
      .in("status", ["pending", "confirmed", "noshow"]),
  ]);

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

  const { data: bookings } = await bookingsQuery;
  const rows = (bookings ?? []) as BookingRow[];
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

  const currentPath = buildFilterUrl({
    date: selectedDate,
    worker: selectedWorker,
    status: selectedStatus,
  });
  const filterFormKey = `${selectedDate}:${selectedWorker}:${selectedStatus}`;

  return (
    <main className="flex flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Admin panel
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Termini
              </h1>
              <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-background px-3 text-xs font-medium text-muted-foreground">
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
          <div className="flex flex-wrap gap-2">
            <form action={logoutAction}>
              <button className="btn-secondary inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold text-foreground">
                Odjavi se
              </button>
            </form>
          </div>
        </header>

        <nav className="flex flex-wrap gap-2">
          {ADMIN_LINKS.map(([href, label]) => {
            const isActive = href === "/admin/termini";

            return (
              <Link
                key={href}
                href={href}
                className={
                  isActive
                    ? "btn-primary rounded-md px-3 py-2 text-sm font-medium text-primary-foreground"
                    : "btn-secondary rounded-md px-3 py-2 text-sm font-medium text-foreground"
                }
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-wrap gap-2">
          <Link
            href={buildFilterUrl({ date: today, status: "active" })}
            className="btn-secondary inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground"
          >
            <span>Danas</span>
            <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs font-semibold text-foreground">
              {todayActiveCount ?? 0}
            </span>
          </Link>
          <Link
            href={buildFilterUrl({ date: today, status: "cancelled" })}
            className="btn-secondary inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground"
          >
            <span>Otkazani</span>
            <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs font-semibold text-foreground">
              {todayCancelledCount ?? 0}
            </span>
          </Link>
          <Link
            href={buildFilterUrl({ date: tomorrow, status: "active" })}
            className="btn-secondary inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground"
          >
            <span>Sutra</span>
            <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs font-semibold text-foreground">
              {tomorrowActiveCount ?? 0}
            </span>
          </Link>
          <Link
            href={buildFilterUrl({ date: today, status: "" })}
            className="btn-secondary inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground"
          >
            <span>Sve danas</span>
            <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs font-semibold text-foreground">
              {todayAllCount ?? 0}
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
          <button className="inline-flex min-h-11 items-center justify-center gap-3 self-start rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary/15 sm:self-auto">
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              +
            </span>
            <span>Ručno dodaj termin</span>
          </button>
        </header>

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
                          Ranije nije dosao {risk.count}x. Proveri telefonom pre
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
                        {booking.workers?.name ?? "Radnik nije pronadjen"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {booking.services?.name ?? "Usluga nije pronadjena"}
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
