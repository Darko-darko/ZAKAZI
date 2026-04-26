import Link from "next/link";
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("sr-Latn-RS", {
    timeZone: "Europe/Belgrade",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
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

  if (params.status) {
    search.set("status", params.status);
  }

  return `/admin/termini?${search.toString()}`;
}

export default async function AdminBookingsPage({
  searchParams,
}: AdminBookingsPageProps) {
  const query = await searchParams;
  const { supabase, provider } = await getCurrentProvider();
  const selectedDate = firstParam(query.date) ?? todayInBelgrade();
  const selectedWorker = firstParam(query.worker) ?? "";
  const selectedStatus = firstParam(query.status) ?? "active";
  const bounds = dayBounds(selectedDate);

  const { data: workers } = await supabase
    .from("workers")
    .select("id, name")
    .eq("provider_id", provider.id)
    .is("archived_at", null)
    .order("created_at");

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

  return (
    <main className="flex flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              Nazad na admin
            </Link>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              Termini
            </h1>
            <p className="mt-1 text-muted-foreground">
              Pregled ko je zakazao, kada, kod koga i za koju uslugu.
            </p>
          </div>
          <Link
            href={`/admin/termini?date=${todayInBelgrade()}`}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-semibold text-foreground transition hover:bg-accent"
          >
            Danas
          </Link>
        </header>

        <form
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
          <button className="min-h-11 self-end rounded-md bg-primary px-4 font-semibold text-primary-foreground transition hover:opacity-90">
            Prikaži
          </button>
        </form>

        <div className="overflow-hidden rounded-md border border-border bg-card">
          {rows.length ? (
            <div className="divide-y divide-border">
              {rows.map((booking) => {
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
                    className="grid gap-3 p-4 sm:grid-cols-[10rem_1fr_12rem_10rem]"
                  >
                    <div>
                      <p className="font-semibold text-foreground">
                        {formatDateTime(booking.starts_at)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        do {formatDateTime(booking.ends_at).split(", ").pop()}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {booking.client_name}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {booking.client_phone}
                        {booking.client_email
                          ? ` · ${booking.client_email}`
                          : ""}
                      </p>
                      {showRisk ? (
                        <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                          Ranije nije došao {risk.count}x. Proveri telefonom pre
                          termina.
                        </p>
                      ) : null}
                      {booking.notes ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {booking.notes}
                        </p>
                      ) : null}
                    </div>
                    <div>
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
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">
              Nema termina za izabrane filtere.
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {workers?.map((worker) => (
            <Link
              key={worker.id}
              href={buildFilterUrl({
                date: selectedDate,
                worker: worker.id,
                status: selectedStatus,
              })}
              className="rounded-md border border-border bg-card p-4 transition hover:bg-accent"
            >
              <p className="font-semibold text-foreground">{worker.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Prikaži samo njegove termine
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
