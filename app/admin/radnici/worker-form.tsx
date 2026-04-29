"use client";

import { useActionState, useState } from "react";
import { TimeInput } from "@/app/admin/_components/time-input";

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
        className="btn-primary rounded-md px-4 py-2.5 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
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
  custom_start_time: string | null;
  custom_end_time: string | null;
  custom_break_start: string | null;
  custom_break_end: string | null;
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

function trimTime(value: string | null) {
  return value ? value.slice(0, 5) : "";
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
        className="btn-primary rounded-md px-4 py-2.5 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
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

type DayMode = "off" | "shift" | "custom";

type DayScheduleState = {
  mode: DayMode;
  shiftId: string;
  customStart: string;
  customEnd: string;
  customBreakStart: string;
  customBreakEnd: string;
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
  const [bulkMode, setBulkMode] = useState<"off" | "shift" | "custom">("shift");
  const [bulkShiftId, setBulkShiftId] = useState("");
  const [bulkCustomStart, setBulkCustomStart] = useState("");
  const [bulkCustomEnd, setBulkCustomEnd] = useState("");
  const scheduleByDay = new Map(
    schedules.map((schedule) => [schedule.day_of_week, schedule]),
  );
  const [daySchedules, setDaySchedules] = useState<Record<number, DayScheduleState>>(
    () =>
      Object.fromEntries(
        weekDays.map(([dayIndex]) => {
          const schedule = scheduleByDay.get(dayIndex);
          const mode: DayMode = schedule?.custom_start_time
            ? "custom"
            : schedule?.shift_id
              ? "shift"
              : "off";

          return [
            dayIndex,
            {
              mode,
              shiftId: schedule?.shift_id ?? "",
              customStart: trimTime(schedule?.custom_start_time ?? null),
              customEnd: trimTime(schedule?.custom_end_time ?? null),
              customBreakStart: trimTime(schedule?.custom_break_start ?? null),
              customBreakEnd: trimTime(schedule?.custom_break_end ?? null),
            },
          ];
        }),
      ) as Record<number, DayScheduleState>,
  );

  function applyBulkToDays(days: number[]) {
    setDaySchedules((current) => {
      const next = { ...current };

      for (const dayIndex of days) {
        next[dayIndex] = {
          mode: bulkMode,
          shiftId: bulkMode === "shift" ? bulkShiftId : "",
          customStart: bulkMode === "custom" ? bulkCustomStart : "",
          customEnd: bulkMode === "custom" ? bulkCustomEnd : "",
          customBreakStart: "",
          customBreakEnd: "",
        };
      }

      return next;
    });
  }

  function updateDayMode(dayIndex: number, nextMode: DayMode) {
    setDaySchedules((current) => {
      const existing = current[dayIndex];

      return {
        ...current,
        [dayIndex]: {
          ...existing,
          mode: nextMode,
          shiftId: nextMode === "shift" ? existing.shiftId : "",
          customStart: nextMode === "custom" ? existing.customStart : "",
          customEnd: nextMode === "custom" ? existing.customEnd : "",
          customBreakStart:
            nextMode === "custom" ? existing.customBreakStart : "",
          customBreakEnd: nextMode === "custom" ? existing.customBreakEnd : "",
        },
      };
    });
  }

  return (
    <form action={formAction} className="space-y-5">
      <section className="space-y-4 rounded-md border border-border bg-background p-4">
        <div className="space-y-1">
          <h3 className="font-medium text-foreground">Brzo popuni vise dana</h3>
          <p className="text-sm text-muted-foreground">
            Kada radnik radi istu smenu cele nedelje ili radnim danima.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[12rem_1fr_1fr_auto_auto]">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="bulk_mode">
              Tip
            </label>
                <select
                  id="bulk_mode"
                  value={bulkMode}
              onChange={(event) =>
                setBulkMode(event.target.value as "off" | "shift" | "custom")
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            >
              <option value="off">Ne radi</option>
              <option value="shift">Smena</option>
              <option value="custom">Custom vreme</option>
            </select>
          </div>

          {bulkMode === "shift" ? (
            <div className="space-y-2 sm:col-span-1 lg:col-span-2">
              <label className="text-sm font-medium text-foreground" htmlFor="bulk_shift">
                Smena
              </label>
              <select
                id="bulk_shift"
                value={bulkShiftId}
                onChange={(event) => setBulkShiftId(event.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              >
                <option value="">Izaberi smenu</option>
                {shifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.name} ({formatTime(shift.start_time)} - {formatTime(shift.end_time)})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {bulkMode === "custom" ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="bulk_custom_start">
                  Od
                </label>
                <TimeInput
                  id="bulk_custom_start"
                  value={bulkCustomStart}
                  onValueChange={setBulkCustomStart}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="bulk_custom_end">
                  Do
                </label>
                <TimeInput
                  id="bulk_custom_end"
                  value={bulkCustomEnd}
                  onValueChange={setBulkCustomEnd}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </div>
            </>
          ) : null}

          <button
            type="button"
            onClick={() => applyBulkToDays(weekDays.map(([dayIndex]) => dayIndex))}
            className="btn-secondary self-end rounded-md px-3 py-2 text-sm font-medium text-foreground"
          >
            Primeni na sve dane
          </button>

          <button
            type="button"
            onClick={() => applyBulkToDays([1, 2, 3, 4, 5])}
            className="btn-secondary self-end rounded-md px-3 py-2 text-sm font-medium text-foreground"
          >
            Primeni pon-pet
          </button>
        </div>
      </section>

      <div className="space-y-4">
        {weekDays.map(([dayIndex, dayName]) => {
          const schedule = daySchedules[dayIndex];
          const mode = schedule?.mode ?? "off";

          return (
            <fieldset
              key={dayName}
              className="grid gap-3 rounded-md border border-border bg-background p-4 sm:grid-cols-[9rem_1fr]"
            >
              <legend className="px-1 text-sm font-semibold text-foreground">
                {dayName}
              </legend>
              <div className="space-y-2">
                <label
                  htmlFor={`mode_${dayIndex}`}
                  className="text-sm font-medium text-foreground"
                >
                  Tip rasporeda
                </label>
                <select
                  id={`mode_${dayIndex}`}
                  name={`mode_${dayIndex}`}
                  value={mode}
                  onChange={(event) =>
                    updateDayMode(dayIndex, event.target.value as DayMode)
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                >
                  <option value="off">Ne radi</option>
                  <option value="shift">Smena</option>
                  <option value="custom">Custom vreme</option>
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {mode === "shift" ? (
                  <div className="space-y-2 sm:col-span-2">
                    <label
                      htmlFor={`shift_${dayIndex}`}
                      className="text-sm font-medium text-foreground"
                    >
                      Smena
                    </label>
                    <select
                      id={`shift_${dayIndex}`}
                      name={`shift_${dayIndex}`}
                      value={schedule?.shiftId ?? ""}
                      onChange={(event) =>
                        setDaySchedules((current) => ({
                          ...current,
                          [dayIndex]: {
                            ...current[dayIndex],
                            shiftId: event.target.value,
                          },
                        }))
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                    >
                      <option value="">Bez smene</option>
                      {shifts.map((shift) => (
                        <option key={shift.id} value={shift.id}>
                          {shift.name} ({formatTime(shift.start_time)} -{" "}
                          {formatTime(shift.end_time)})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <input
                    id={`shift_${dayIndex}`}
                    name={`shift_${dayIndex}`}
                    type="hidden"
                    value=""
                    readOnly
                  />
                )}

                {mode === "custom" ? (
                  <>
                    <div className="space-y-2">
                      <label
                        htmlFor={`custom_start_${dayIndex}`}
                        className="text-sm font-medium text-foreground"
                      >
                        Custom od
                      </label>
                      <TimeInput
                        id={`custom_start_${dayIndex}`}
                        name={`custom_start_${dayIndex}`}
                        value={schedule?.customStart ?? ""}
                        onValueChange={(nextValue) =>
                          setDaySchedules((current) => ({
                            ...current,
                            [dayIndex]: {
                              ...current[dayIndex],
                              customStart: nextValue,
                            },
                          }))
                        }
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor={`custom_end_${dayIndex}`}
                        className="text-sm font-medium text-foreground"
                      >
                        Custom do
                      </label>
                      <TimeInput
                        id={`custom_end_${dayIndex}`}
                        name={`custom_end_${dayIndex}`}
                        value={schedule?.customEnd ?? ""}
                        onValueChange={(nextValue) =>
                          setDaySchedules((current) => ({
                            ...current,
                            [dayIndex]: {
                              ...current[dayIndex],
                              customEnd: nextValue,
                            },
                          }))
                        }
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor={`custom_break_start_${dayIndex}`}
                        className="text-sm font-medium text-foreground"
                      >
                        Pauza od
                      </label>
                      <TimeInput
                        id={`custom_break_start_${dayIndex}`}
                        name={`custom_break_start_${dayIndex}`}
                        value={schedule?.customBreakStart ?? ""}
                        onValueChange={(nextValue) =>
                          setDaySchedules((current) => ({
                            ...current,
                            [dayIndex]: {
                              ...current[dayIndex],
                              customBreakStart: nextValue,
                            },
                          }))
                        }
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor={`custom_break_end_${dayIndex}`}
                        className="text-sm font-medium text-foreground"
                      >
                        Pauza do
                      </label>
                      <TimeInput
                        id={`custom_break_end_${dayIndex}`}
                        name={`custom_break_end_${dayIndex}`}
                        value={schedule?.customBreakEnd ?? ""}
                        onValueChange={(nextValue) =>
                          setDaySchedules((current) => ({
                            ...current,
                            [dayIndex]: {
                              ...current[dayIndex],
                              customBreakEnd: nextValue,
                            },
                          }))
                        }
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <input id={`custom_start_${dayIndex}`} name={`custom_start_${dayIndex}`} type="hidden" value={schedule?.customStart ?? ""} readOnly />
                    <input id={`custom_end_${dayIndex}`} name={`custom_end_${dayIndex}`} type="hidden" value={schedule?.customEnd ?? ""} readOnly />
                    <input id={`custom_break_start_${dayIndex}`} name={`custom_break_start_${dayIndex}`} type="hidden" value={schedule?.customBreakStart ?? ""} readOnly />
                    <input id={`custom_break_end_${dayIndex}`} name={`custom_break_end_${dayIndex}`} type="hidden" value={schedule?.customBreakEnd ?? ""} readOnly />
                  </>
                )}
              </div>
            </fieldset>
          );
        })}
      </div>

      {!shifts.length ? (
        <div className="rounded-md border border-border bg-background p-5 text-sm text-muted-foreground">
          Nema smena. I dalje mozes sacuvati custom vreme po danima.
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="btn-primary rounded-md px-4 py-2.5 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Cuvanje..." : "Sacuvaj raspored"}
      </button>
      <FormMessage state={state} />
    </form>
  );
}
