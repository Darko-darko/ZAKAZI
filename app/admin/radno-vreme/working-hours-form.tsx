"use client";

import { useActionState } from "react";

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

export function WorkingHoursForm({ action, hours }: WorkingHoursFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const hoursByDay = new Map(hours.map((item) => [item.day_of_week, item]));

  return (
    <form action={formAction} className="space-y-5">
      <div className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
        {weekDays.map(([dayIndex, dayName]) => {
          const item = hoursByDay.get(dayIndex);

          return (
            <div
              key={dayName}
              className="grid gap-4 p-4 sm:grid-cols-[10rem_1fr_1fr_auto] sm:items-end"
            >
              <p className="pb-2 font-medium text-foreground">{dayName}</p>

              <div className="space-y-2">
                <label
                  htmlFor={`opens_${dayIndex}`}
                  className="text-sm font-medium text-foreground"
                >
                  Otvara
                </label>
                <input
                  id={`opens_${dayIndex}`}
                  name={`opens_${dayIndex}`}
                  type="time"
                  defaultValue={trimTime(item?.opens_at ?? "09:00")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor={`closes_${dayIndex}`}
                  className="text-sm font-medium text-foreground"
                >
                  Zatvara
                </label>
                <input
                  id={`closes_${dayIndex}`}
                  name={`closes_${dayIndex}`}
                  type="time"
                  defaultValue={trimTime(item?.closes_at ?? "17:00")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </div>

              <label className="flex min-h-10 items-center gap-2 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  name={`closed_${dayIndex}`}
                  defaultChecked={item?.is_closed ?? false}
                  className="size-4 accent-primary"
                />
                Ne radi
              </label>
            </div>
          );
        })}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
