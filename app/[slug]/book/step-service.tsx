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
        Šta zakazuješ?
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Izaberi uslugu — termin se prilagođava trajanju.
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
              className="flex items-start justify-between gap-4 rounded-md border border-border bg-card p-4 transition hover:border-primary hover:ring-2 hover:ring-primary/15"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">{service.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDuration(service.duration_minutes)}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-foreground">
                {formatPrice(service.price)}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-md border border-border bg-muted p-4 text-sm text-muted-foreground">
          Ovaj radnik trenutno nema objavljene usluge.
        </div>
      )}
    </section>
  );
}
