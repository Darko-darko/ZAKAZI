import Link from "next/link";
import { notFound } from "next/navigation";
import {
  canClientCancelBooking,
  getBookingCancellationWindowMessage,
  getBookingContextByCancelToken,
} from "@/lib/email/booking";
import { cancelBookingAction } from "./actions";

type CancellationPageProps = {
  params: Promise<{ slug: string; token: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("sr-Latn-RS", {
    timeZone: "Europe/Belgrade",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("sr-Latn-RS", {
    timeZone: "Europe/Belgrade",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return mins === 0 ? `${hours} h` : `${hours} h ${mins} min`;
}

function formatPrice(price: number | null) {
  if (price === null) {
    return "Cena po dogovoru";
  }

  return `${price.toLocaleString("sr-Latn-RS")} RSD`;
}

function resolveErrorMessage(status: string | undefined, fallback: string) {
  if (status === "already_cancelled") {
    return "Ovaj termin je vec otkazan.";
  }

  if (status === "not_found") {
    return "Link za otkazivanje nije vazeci.";
  }

  if (status === "invalid_status") {
    return "Termin vise nije dostupan za otkazivanje.";
  }

  return fallback;
}

export default async function CancellationPage({
  params,
  searchParams,
}: CancellationPageProps) {
  const { slug, token } = await params;
  const query = await searchParams;
  const context = await getBookingContextByCancelToken(token);

  if (!context || context.providerSlug !== slug) {
    notFound();
  }

  const submittedStatus = firstParam(query.status);
  const submittedMessage = firstParam(query.message);
  const canCancel = canClientCancelBooking(context);
  const cancel = cancelBookingAction.bind(null, slug, token);

  let infoMessage: string | null = null;
  let tone: "warning" | "danger" | null = null;

  if (submittedStatus || submittedMessage) {
    infoMessage = resolveErrorMessage(submittedStatus, submittedMessage ?? "");
    tone = submittedStatus === "not_cancellable" ? "warning" : "danger";
  } else if (!canCancel) {
    if (context.status === "cancelled") {
      infoMessage = "Ovaj termin je vec otkazan.";
      tone = "warning";
    } else if (context.status !== "confirmed") {
      infoMessage = "Termin vise nije dostupan za otkazivanje.";
      tone = "warning";
    } else {
      infoMessage = getBookingCancellationWindowMessage(context);
      tone = "warning";
    }
  }

  return (
    <main className="flex flex-1 bg-background px-5 py-8">
      <section className="mx-auto flex w-full max-w-xl flex-col justify-center">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-brand">
            Otkazivanje termina
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            {context.providerName}
          </h1>
          <p className="mt-3 text-muted-foreground">
            Proveri detalje ispod pre nego sto potvrdis otkazivanje termina.
          </p>

          <div className="mt-6 overflow-hidden rounded-xl border border-border bg-background">
            <div className="bg-brand px-4 py-3 text-brand-foreground">
              <p className="text-xs font-semibold uppercase tracking-wider opacity-90">
                Termin
              </p>
              <p className="mt-0.5 text-lg font-semibold">
                {formatDateTime(context.startsAt)}
              </p>
            </div>
            <dl className="divide-y divide-border">
              <div className="flex items-baseline justify-between gap-4 p-4">
                <dt className="text-sm text-muted-foreground">Usluga</dt>
                <dd className="text-right font-semibold text-foreground">
                  {context.serviceName}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 p-4">
                <dt className="text-sm text-muted-foreground">Radnik</dt>
                <dd className="text-right font-semibold text-foreground">
                  {context.workerName}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 p-4">
                <dt className="text-sm text-muted-foreground">Trajanje</dt>
                <dd className="text-right font-semibold text-foreground">
                  {formatDuration(context.serviceDurationMinutes)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 p-4">
                <dt className="text-sm text-muted-foreground">Vreme</dt>
                <dd className="text-right font-semibold text-foreground">
                  {formatTime(context.startsAt)} - {formatTime(context.endsAt)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 p-4">
                <dt className="text-sm text-muted-foreground">Cena</dt>
                <dd className="text-right font-semibold text-foreground">
                  {formatPrice(context.servicePrice)}
                </dd>
              </div>
            </dl>
          </div>

          {infoMessage ? (
            <div
              className={`mt-5 rounded-xl p-3 text-sm font-medium ${
                tone === "danger"
                  ? "border border-destructive/30 bg-destructive/10 text-destructive"
                  : "border border-amber-300/40 bg-amber-50 text-amber-900"
              }`}
            >
              {infoMessage}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {canCancel ? (
              <form action={cancel} className="flex-1">
                <button
                  type="submit"
                  className="min-h-12 w-full rounded-xl bg-destructive px-4 font-semibold text-white transition hover:opacity-90"
                >
                  Potvrdi otkazivanje
                </button>
              </form>
            ) : null}

            <Link
              href={`/${slug}`}
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-border px-4 font-semibold text-foreground"
            >
              Nazad na stranicu
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
