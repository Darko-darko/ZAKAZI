import { createBookingAction } from "./actions";
import {
  formatDateLong,
  formatDuration,
  formatPrice,
  formatTime,
} from "./utils";

type StepConfirmProps = {
  slug: string;
  service: {
    id: string;
    name: string;
    duration_minutes: number;
    price: number | null;
  };
  workerName: string;
  date: string;
  startsAt: string;
  workerId: string;
  error?: string;
};

export function StepConfirm({
  slug,
  service,
  workerName,
  date,
  startsAt,
  workerId,
  error,
}: StepConfirmProps) {
  const book = createBookingAction.bind(null, slug);

  return (
    <section>
      <h2 className="text-2xl font-bold tracking-tight text-foreground">
        Potvrdi termin
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Proveri detalje i unesi svoje podatke za potvrdu termina.
      </p>

      <div className="mt-5 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="bg-brand px-4 py-3 text-brand-foreground">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-90">
            Tvoj termin
          </p>
          <p className="mt-0.5 text-lg font-semibold">
            {formatDateLong(date)} - {formatTime(startsAt)}
          </p>
        </div>
        <dl className="divide-y divide-border">
          <div className="flex items-baseline justify-between gap-4 p-4">
            <dt className="text-sm text-muted-foreground">Usluga</dt>
            <dd className="text-right font-semibold text-foreground">
              {service.name}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 p-4">
            <dt className="text-sm text-muted-foreground">Trajanje</dt>
            <dd className="text-right font-semibold text-foreground">
              {formatDuration(service.duration_minutes)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 p-4">
            <dt className="text-sm text-muted-foreground">Cena</dt>
            <dd className="text-right font-semibold text-brand">
              {formatPrice(service.price)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 p-4">
            <dt className="text-sm text-muted-foreground">Radnik</dt>
            <dd className="text-right font-semibold text-foreground">
              {workerName}
            </dd>
          </div>
        </dl>
      </div>

      {error ? (
        <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive">
          {error}
        </div>
      ) : null}

      <form action={book} className="mt-6 space-y-5">
        <input type="hidden" name="service_id" value={service.id} />
        <input type="hidden" name="worker_id" value={workerId} />
        <input type="hidden" name="starts_at" value={startsAt} />

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
            className="min-h-12 w-full rounded-lg border border-input bg-background px-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
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
            className="min-h-12 w-full rounded-lg border border-input bg-background px-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
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
            required
            autoComplete="email"
            className="min-h-12 w-full rounded-lg border border-input bg-background px-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
          <p className="text-xs text-muted-foreground">
            Email je obavezan jer na njega saljemo potvrdu termina i link za
            otkazivanje.
          </p>
        </div>
        <div className="space-y-2">
          <label
            htmlFor="notes"
            className="text-sm font-medium text-foreground"
          >
            Napomena <span className="text-muted-foreground">(opciono)</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>

        <button
          type="submit"
          className="btn-primary min-h-12 w-full rounded-xl px-4 font-semibold text-primary-foreground"
        >
          Zakazi termin
        </button>
      </form>
    </section>
  );
}
