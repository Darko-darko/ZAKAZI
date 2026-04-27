"use client";

import { useActionState } from "react";

type WorkerActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const initialWorkerActionState: WorkerActionState = {
  status: "idle",
  message: "",
};

function FormMessage({ state }: { state: WorkerActionState }) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      className={
        state.status === "error"
          ? "text-sm font-medium text-destructive"
          : "text-sm font-medium text-foreground"
      }
    >
      {state.message}
    </p>
  );
}

type WorkerFormProps = {
  action: (
    prevState: WorkerActionState,
    formData: FormData,
  ) => Promise<WorkerActionState>;
  submitLabel: string;
  worker?: {
    name: string;
    bio: string | null;
  };
};

export function WorkerForm({ action, submitLabel, worker }: WorkerFormProps) {
  const [state, formAction, pending] = useActionState(
    action,
    initialWorkerActionState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium text-foreground">
          Ime radnika
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={worker?.name}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="bio" className="text-sm font-medium text-foreground">
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={4}
          defaultValue={worker?.bio ?? ""}
          className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Cuvanje..." : submitLabel}
      </button>
      <FormMessage state={state} />
    </form>
  );
}

type WorkerService = {
  id: string;
  name: string;
  duration_minutes: number;
  price: number | null;
  is_active: boolean;
};

type WorkerShift = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
};

type WorkerSchedule = {
  day_of_week: number;
  shift_id: string | null;
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

function formatTime(value: string) {
  return value.slice(0, 5);
}

type WorkerServicesFormProps = {
  action: (
    prevState: WorkerActionState,
    formData: FormData,
  ) => Promise<WorkerActionState>;
  selectedServiceIds: string[];
  services: WorkerService[];
};

export function WorkerServicesForm({
  action,
  selectedServiceIds,
  services,
}: WorkerServicesFormProps) {
  const [state, formAction, pending] = useActionState(
    action,
    initialWorkerActionState,
  );
  const selectedIds = new Set(selectedServiceIds);

  return (
    <form action={formAction} className="space-y-5">
      {services.length ? (
        <div className="divide-y divide-border rounded-md border border-border">
          {services.map((service) => (
            <label
              key={service.id}
              className="grid cursor-pointer gap-3 p-4 transition hover:bg-accent sm:grid-cols-[auto_1fr_auto]"
            >
              <input
                type="checkbox"
                name="service_id"
                value={service.id}
                defaultChecked={selectedIds.has(service.id)}
                className="mt-1 size-4 accent-primary"
              />
              <span>
                <span className="block font-medium text-foreground">
                  {service.name}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {service.duration_minutes} min
                  {service.price === null ? "" : ` · ${service.price} RSD`}
                </span>
              </span>
              <span className="text-sm text-muted-foreground">
                {service.is_active ? "Aktivna" : "Neaktivna"}
              </span>
            </label>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-border bg-background p-5 text-sm text-muted-foreground">
          Prvo dodaj usluge u admin modulu Usluge.
        </div>
      )}

      <button
        type="submit"
        disabled={!services.length || pending}
        className="rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Cuvanje..." : "Sacuvaj usluge radnika"}
      </button>
      <FormMessage state={state} />
    </form>
  );
}

type WorkerScheduleFormProps = {
  action: (
    prevState: WorkerActionState,
    formData: FormData,
  ) => Promise<WorkerActionState>;
  schedules: WorkerSchedule[];
  shifts: WorkerShift[];
};

export function WorkerScheduleForm({
  action,
  schedules,
  shifts,
}: WorkerScheduleFormProps) {
  const [state, formAction, pending] = useActionState(
    action,
    initialWorkerActionState,
  );
  const scheduleByDay = new Map(
    schedules.map((schedule) => [schedule.day_of_week, schedule.shift_id]),
  );

  return (
    <form action={formAction} className="space-y-5">
      {shifts.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {weekDays.map(([dayIndex, dayName]) => (
            <div key={dayName} className="space-y-2">
              <label
                htmlFor={`shift_${dayIndex}`}
                className="text-sm font-medium text-foreground"
              >
                {dayName}
              </label>
              <select
                id={`shift_${dayIndex}`}
                name={`shift_${dayIndex}`}
                defaultValue={scheduleByDay.get(dayIndex) ?? ""}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              >
                <option value="">Ne radi</option>
                {shifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.name} ({formatTime(shift.start_time)} -{" "}
                    {formatTime(shift.end_time)})
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-border bg-background p-5 text-sm text-muted-foreground">
          Prvo dodaj bar jednu smenu u admin modulu Smene.
        </div>
      )}

      <button
        type="submit"
        disabled={!shifts.length || pending}
        className="rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Cuvanje..." : "Sacuvaj raspored"}
      </button>
      <FormMessage state={state} />
    </form>
  );
}
