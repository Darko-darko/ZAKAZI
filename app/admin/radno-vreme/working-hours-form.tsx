"use client";

import { useActionState, useState } from "react";
import { TimeInput } from "@/app/admin/_components/time-input";

type WorkingHoursState = {
  status: "idle" | "success" | "error";
  message: string;
};

type WorkingHour = {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
};

type WorkingHoursFormProps = {
  action: (
    prevState: WorkingHoursState,
    formData: FormData,
  ) => Promise<WorkingHoursState>;
  hours: WorkingHour[];
};

const initialState: WorkingHoursState = {
  status: "idle",
  message: "",
};

const weekDays = [
  [1, "Ponedeljak"],
  [2, "Utorak"],
  [3, "Sreda"],
  [4, "Cetvrtak"],
  [5, "Petak"],
  [6, "Subota"],
  [0, "Nedelja"],
] as const;

function trimTime(value: string | null) {
  return value ? value.slice(0, 5) : "";
}

type DayHoursState = {
  opensAt: string;
  closesAt: string;
  isClosed: boolean;
};

export function WorkingHoursForm({ action, hours }: WorkingHoursFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const hoursByDay = new Map(hours.map((item) => [item.day_of_week, item]));
  const [bulkOpensAt, setBulkOpensAt] = useState("09:00");
  const [bulkClosesAt, setBulkClosesAt] = useState("17:00");
  const [dayHours, setDayHours] = useState<Record<number, DayHoursState>>(
    () =>
      Object.fromEntries(
        weekDays.map(([dayIndex]) => {
          const item = hoursByDay.get(dayIndex);

          return [
            dayIndex,
            {
              opensAt: trimTime(item?.opens_at ?? "09:00"),
              closesAt: trimTime(item?.closes_at ?? "17:00"),
              isClosed: item?.is_closed ?? false,
            },
          ];
        }),
      ) as Record<number, DayHoursState>,
  );

  function applyBulkToDays(days: number[]) {
    setDayHours((current) => {
      const next = { ...current };

      for (const dayIndex of days) {
        next[dayIndex] = {
          ...next[dayIndex],
          opensAt: bulkOpensAt,
          closesAt: bulkClosesAt,
          isClosed: false,
        };
      }

      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-5">
      <section className="rounded-lg border border-primary/20 bg-primary/5 p-4 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
              Generalno radno vreme
            </p>
            <h3 className="text-base font-semibold text-foreground">
              Primeni isto vreme na vise dana
            </h3>
            <p className="text-sm text-muted-foreground">
              Koristi ovo kada je raspored isti za celu nedelju ili za radne dane.
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto_auto]">
          <div className="space-y-2 rounded-md border border-primary/15 bg-background/80 p-3">
            <label
              htmlFor="bulk_opens"
              className="text-sm font-medium text-foreground"
            >
              Otvara
            </label>
            <TimeInput
              id="bulk_opens"
              value={bulkOpensAt}
              onValueChange={setBulkOpensAt}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div className="space-y-2 rounded-md border border-primary/15 bg-background/80 p-3">
            <label
              htmlFor="bulk_closes"
              className="text-sm font-medium text-foreground"
            >
              Zatvara
            </label>
            <TimeInput
              id="bulk_closes"
              value={bulkClosesAt}
              onValueChange={setBulkClosesAt}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <button
            type="button"
            onClick={() => applyBulkToDays(weekDays.map(([dayIndex]) => dayIndex))}
            className="btn-secondary self-end rounded-md px-4 py-2.5 text-sm font-medium text-foreground"
          >
            Primeni na sve
          </button>

          <button
            type="button"
            onClick={() => applyBulkToDays([1, 2, 3, 4, 5])}
            className="btn-secondary self-end rounded-md px-4 py-2.5 text-sm font-medium text-foreground"
          >
            Primeni pon-pet
          </button>
        </div>
      </section>

      <div className="space-y-3">
        {weekDays.map(([dayIndex, dayName]) => {
          const item = dayHours[dayIndex];

          return (
            <section
              key={dayName}
              className="rounded-lg border border-border bg-card p-4 shadow-sm shadow-black/5"
            >
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
                <div>
                  <h3 className="font-semibold text-foreground">{dayName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {item?.isClosed
                      ? "Neradni dan"
                      : "Podesi vreme otvaranja i zatvaranja"}
                  </p>
                </div>

                <label className="flex min-h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground">
                  <input
                    type="checkbox"
                    name={`closed_${dayIndex}`}
                    checked={item?.isClosed ?? false}
                    onChange={(event) =>
                      setDayHours((current) => ({
                        ...current,
                        [dayIndex]: {
                          ...current[dayIndex],
                          isClosed: event.target.checked,
                          opensAt: event.target.checked
                            ? ""
                            : current[dayIndex].opensAt || "09:00",
                          closesAt: event.target.checked
                            ? ""
                            : current[dayIndex].closesAt || "17:00",
                        },
                      }))
                    }
                    className="size-4 accent-primary"
                  />
                  Ne radi
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 rounded-md border border-border bg-background p-3">
                  <label
                    htmlFor={`opens_${dayIndex}`}
                    className="text-sm font-medium text-foreground"
                  >
                    Otvara
                  </label>
                  <TimeInput
                    id={`opens_${dayIndex}`}
                    name={`opens_${dayIndex}`}
                    value={item?.opensAt ?? ""}
                    onValueChange={(nextValue) =>
                      setDayHours((current) => ({
                        ...current,
                        [dayIndex]: {
                          ...current[dayIndex],
                          opensAt: nextValue,
                        },
                      }))
                    }
                    disabled={item?.isClosed}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition disabled:cursor-not-allowed disabled:opacity-50 focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                </div>

                <div className="space-y-2 rounded-md border border-border bg-background p-3">
                  <label
                    htmlFor={`closes_${dayIndex}`}
                    className="text-sm font-medium text-foreground"
                  >
                    Zatvara
                  </label>
                  <TimeInput
                    id={`closes_${dayIndex}`}
                    name={`closes_${dayIndex}`}
                    value={item?.closesAt ?? ""}
                    onValueChange={(nextValue) =>
                      setDayHours((current) => ({
                        ...current,
                        [dayIndex]: {
                          ...current[dayIndex],
                          closesAt: nextValue,
                        },
                      }))
                    }
                    disabled={item?.isClosed}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition disabled:cursor-not-allowed disabled:opacity-50 focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-primary rounded-md px-4 py-2.5 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Cuvanje..." : "Sacuvaj radno vreme"}
      </button>

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
    </form>
  );
}
