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
        className="mt-5 flex min-h-14 items-center gap-3 rounded-md border border-border bg-card p-3 transition hover:border-primary hover:ring-2 hover:ring-primary/15"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-bold text-muted-foreground">
          ?
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-foreground">Bilo ko</span>
          <span className="block text-xs text-muted-foreground">
            Najbrži slobodan termin
          </span>
        </span>
        <span aria-hidden="true" className="text-muted-foreground">
          ›
        </span>
      </Link>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {workers.map((worker) => (
          <Link
            key={worker.id}
            href={buildBookingUrl(slug, { worker: worker.id })}
            className="overflow-hidden rounded-md border border-border bg-card transition hover:border-primary hover:ring-2 hover:ring-primary/15 sm:flex sm:min-h-44 sm:flex-col"
          >
            {worker.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={worker.photo_url}
                alt=""
                className="aspect-[4/3] w-full object-cover sm:aspect-square"
              />
            ) : (
              <span className="flex aspect-[4/3] w-full items-center justify-center bg-muted text-4xl font-bold text-muted-foreground sm:aspect-square">
                {worker.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="block p-3 text-center sm:flex-1">
              <span className="block text-lg font-semibold text-foreground">
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
