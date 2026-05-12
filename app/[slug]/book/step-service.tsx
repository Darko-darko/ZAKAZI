import Link from "next/link";
import { buildBookingUrl, formatDuration, formatPrice } from "./utils";

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price: number | null;
};

type StepServiceProps = {
  slug: string;
  workerParam: string;
  services: Service[];
};

export function StepService({ slug, workerParam, services }: StepServiceProps) {
  return (
    <section>
      <h2 className="text-2xl font-bold tracking-tight text-foreground">
        Izaberi uslugu
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Izaberi uslugu. Slobodni termini se prilagodjavaju njenom trajanju.
      </p>

      {services.length ? (
        <div className="mt-5 grid gap-3">
          {services.map((service) => (
            <Link
              key={service.id}
              href={buildBookingUrl(slug, {
                worker: workerParam,
                service: service.id,
              })}
              className="group relative flex items-center justify-between gap-4 overflow-hidden rounded-xl border border-border bg-card p-4 pl-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
            >
              <span
                aria-hidden
                className="absolute left-0 top-0 h-full w-1 bg-brand-soft transition group-hover:bg-brand"
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">{service.name}</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5"
                    aria-hidden
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                  {formatDuration(service.duration_minutes)}
                </p>
              </div>
              <p className="shrink-0 text-base font-semibold text-brand">
                {formatPrice(service.price)}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-border bg-muted p-4 text-sm text-muted-foreground">
          Ovaj radnik trenutno nema objavljene usluge.
        </div>
      )}
    </section>
  );
}
