"use client";

import { useActionState } from "react";
import type { WorkingHoursState } from "./actions";

type NonWorkingDay = {
  id: string;
  date_from: string;
  date_to: string;
  reason: string | null;
  is_public_holiday: boolean;
};

type NonWorkingDaysFormProps = {
  action: (
    prevState: WorkingHoursState,
    formData: FormData,
  ) => Promise<WorkingHoursState>;
  deleteAction: (formData: FormData) => Promise<void>;
  days: NonWorkingDay[];
};

const initialState: WorkingHoursState = {
  status: "idle",
  message: "",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("sr-Latn-RS", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Belgrade",
  }).format(new Date(`${value}T12:00:00+01:00`));
}

function formatRange(dateFrom: string, dateTo: string) {
  if (dateFrom === dateTo) {
    return formatDate(dateFrom);
  }

  return `${formatDate(dateFrom)} - ${formatDate(dateTo)}`;
}

export function NonWorkingDaysForm({
  action,
  deleteAction,
  days,
}: NonWorkingDaysFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <section className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-sm shadow-black/5">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
          Neradni dani i praznici
        </p>
        <h2 className="text-xl font-semibold text-foreground">
          Zatvori salon za odredjene datume
        </h2>
        <p className="text-sm text-muted-foreground">
          Ovo blokira online termine za ceo salon i prikazuje informaciju na mini sajtu.
        </p>
      </div>

      <form action={formAction} className="grid gap-4 rounded-lg border border-border bg-background p-4 lg:grid-cols-[1fr_1fr_1.3fr_auto]">
        <div className="space-y-2">
          <label
            htmlFor="date_from"
            className="text-sm font-medium text-foreground"
          >
            Od datuma
          </label>
          <input
            id="date_from"
            name="date_from"
            type="date"
            required
            className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="date_to"
            className="text-sm font-medium text-foreground"
          >
            Do datuma
          </label>
          <input
            id="date_to"
            name="date_to"
            type="date"
            required
            className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="reason"
            className="text-sm font-medium text-foreground"
          >
            Opis
          </label>
          <input
            id="reason"
            name="reason"
            type="text"
            placeholder="Npr. Dan drzavnosti, kolektivni odmor..."
            className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              name="is_public_holiday"
              className="size-4 accent-primary"
            />
            Obelezi kao praznik
          </label>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="btn-primary min-h-11 self-end rounded-md px-4 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Cuvanje..." : "Dodaj"}
        </button>
      </form>

      {state.message ? (
        <p
          className={
            state.status === "error"
              ? "text-sm font-medium text-destructive"
              : "text-sm font-medium text-foreground"
          }
        >
          {state.message}
        </p>
      ) : null}

      <div className="space-y-3">
        {days.length ? (
          days.map((day) => (
            <div
              key={day.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">
                    {formatRange(day.date_from, day.date_to)}
                  </p>
                  {day.is_public_holiday ? (
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      Praznik
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  {day.reason || "Neradni dan za ceo salon."}
                </p>
              </div>

              <form action={deleteAction}>
                <input type="hidden" name="id" value={day.id} />
                <button
                  type="submit"
                  className="inline-flex min-h-10 items-center justify-center rounded-md border border-border px-3 text-sm font-medium text-foreground transition hover:border-destructive/30 hover:text-destructive"
                >
                  Obrisi
                </button>
              </form>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
            Jos nema dodatih neradnih dana. Dodaj praznike, godisnji odmor ili druge dane kada salon ne prima termine.
          </div>
        )}
      </div>
    </section>
  );
}
