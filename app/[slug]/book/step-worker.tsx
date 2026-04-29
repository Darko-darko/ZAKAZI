import Link from "next/link";
import { ANY_WORKER, buildBookingUrl } from "./utils";

type Worker = {
  id: string;
  name: string;
  photo_url: string | null;
  bio: string | null;
};

type StepWorkerProps = {
  slug: string;
  workers: Worker[];
};

export function StepWorker({ slug, workers }: StepWorkerProps) {
  return (
    <section>
      <h2 className="text-2xl font-bold tracking-tight text-foreground">
        Kod koga ideš?
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Izaberi osobu kod koje želiš termin.
      </p>

      <Link
        href={buildBookingUrl(slug, { worker: ANY_WORKER })}
        className="group relative mt-5 flex min-h-14 items-center gap-3 overflow-hidden rounded-xl border border-brand/30 bg-brand-soft p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:shadow-md"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-sm">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-foreground">Bilo ko</span>
            <span className="rounded-full bg-warm-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warm-foreground">
              Najbrže
            </span>
          </span>
          <span className="block text-xs text-muted-foreground">
            Najbrži slobodan termin
          </span>
        </span>
        <span aria-hidden className="text-brand transition group-hover:translate-x-0.5">
          →
        </span>
      </Link>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {workers.map((worker) => (
          <Link
            key={worker.id}
            href={buildBookingUrl(slug, { worker: worker.id })}
            className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md sm:flex sm:min-h-44 sm:flex-col"
          >
            {worker.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={worker.photo_url}
                alt=""
                className="aspect-[4/3] w-full object-cover sm:aspect-square"
              />
            ) : (
              <span className="flex aspect-[4/3] w-full items-center justify-center bg-brand-soft text-4xl font-bold text-brand sm:aspect-square">
                {worker.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="block p-3 text-center sm:flex-1">
              <span className="block text-lg font-semibold text-foreground transition group-hover:text-brand">
                {worker.name}
              </span>
              {worker.bio ? (
                <span className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {worker.bio}
                </span>
              ) : null}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
