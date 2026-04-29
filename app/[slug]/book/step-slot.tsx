import Link from "next/link";
import {
  addDays,
  buildBookingUrl,
  formatDateShort,
  formatTime,
  todayInBelgrade,
} from "./utils";

type PublicSlot = {
  worker_id: string;
  worker_name: string;
  starts_at: string;
  ends_at: string;
};

type StepSlotProps = {
  slug: string;
  workerParam: string;
  serviceId: string;
  selectedDate: string;
  slots: PublicSlot[];
  showWorkerName: boolean;
  nonWorkingMessage?: string | null;
};

export function StepSlot({
  slug,
  workerParam,
  serviceId,
  selectedDate,
  slots,
  showWorkerName,
  nonWorkingMessage,
}: StepSlotProps) {
  const today = todayInBelgrade();
  const dates = Array.from({ length: 7 }, (_, index) => addDays(today, index));

  return (
    <section>
      <h2 className="text-2xl font-bold tracking-tight text-foreground">
        Izaberi termin
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Prvo dan, pa slobodan termin.
      </p>

      <div className="mt-5 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2 pb-1 sm:grid sm:grid-cols-7 sm:gap-2">
          {dates.map((date) => {
            const isSelected = date === selectedDate;
            const isToday = date === today;
            const [weekday, ...rest] = formatDateShort(date).split(" ");

            return (
              <Link
                key={date}
                href={buildBookingUrl(slug, {
                  worker: workerParam,
                  service: serviceId,
                  date,
                })}
                replace
                className={
                  isSelected
                    ? "flex min-h-16 min-w-20 flex-col items-center justify-center rounded-xl border border-brand bg-brand px-3 text-center text-brand-foreground shadow-md transition"
                    : "flex min-h-16 min-w-20 flex-col items-center justify-center rounded-xl border border-border bg-card px-3 text-center text-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
                }
              >
                <span
                  className={
                    isSelected
                      ? "text-[10px] font-semibold uppercase tracking-wider opacity-90"
                      : "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                  }
                >
                  {isToday ? "Danas" : weekday}
                </span>
                <span className="mt-0.5 text-base font-bold">
                  {rest.join(" ")}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        {slots.length ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((slot) => (
              <Link
                key={`${slot.worker_id}-${slot.starts_at}`}
                href={buildBookingUrl(slug, {
                  worker: workerParam,
                  service: serviceId,
                  date: selectedDate,
                  slot: `${slot.worker_id}|${slot.starts_at}`,
                })}
                className="group flex min-h-14 flex-col items-center justify-center rounded-xl border border-border bg-card px-2 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:bg-brand-soft hover:shadow-md"
              >
                <span className="text-base font-bold text-foreground transition group-hover:text-brand">
                  {formatTime(slot.starts_at)}
                </span>
                {showWorkerName ? (
                  <span className="mt-0.5 max-w-full truncate text-xs text-muted-foreground">
                    {slot.worker_name}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-xl border border-warm/30 bg-warm-soft p-4 text-sm text-warm-foreground">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <span>{nonWorkingMessage ?? "Nema slobodnih termina za izabrani dan."}</span>
          </div>
        )}
      </div>
    </section>
  );
}
