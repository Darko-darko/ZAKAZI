"use client";

import { useState } from "react";
import { TimeInput } from "@/app/admin/_components/time-input";

const weekDays = [
  [1, "Pon"],
  [2, "Uto"],
  [3, "Sre"],
  [4, "Cet"],
  [5, "Pet"],
  [6, "Sub"],
  [0, "Ned"],
] as const;

type Worker = {
  id: string;
  name: string;
  is_active: boolean;
};

type Shift = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
};

type ScheduleRow = {
  worker_id: string;
  day_of_week: number;
  shift_id: string | null;
  custom_start_time: string | null;
  custom_end_time: string | null;
};

type ScheduleMatrixFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  workers: Worker[];
  shifts: Shift[];
  schedules: ScheduleRow[];
};

type CellMode = "off" | "shift" | "custom";

type CellScheduleState = {
  mode: CellMode;
  shiftId: string;
  customStart: string;
  customEnd: string;
};

function trimTime(value: string | null) {
  return value ? value.slice(0, 5) : "";
}

function formatTime(value: string) {
  return value.slice(0, 5);
}

function formatShiftName(shift: Shift) {
  return shift.name;
}

export function ScheduleMatrixForm({
  action,
  workers,
  shifts,
  schedules,
}: ScheduleMatrixFormProps) {
  const scheduleByWorkerDay = new Map(
    schedules.map((schedule) => [
      `${schedule.worker_id}_${schedule.day_of_week}`,
      schedule,
    ]),
  );
  const [cells, setCells] = useState<Record<string, CellScheduleState>>(
    () =>
      Object.fromEntries(
        workers.flatMap((worker) =>
          weekDays.map(([dayIndex]) => {
            const key = `${worker.id}_${dayIndex}`;
            const schedule = scheduleByWorkerDay.get(key);
            const mode: CellMode = schedule?.custom_start_time
              ? "custom"
              : schedule?.shift_id
                ? "shift"
                : "off";

            return [
              key,
              {
                mode,
                shiftId: schedule?.shift_id ?? "",
                customStart: trimTime(schedule?.custom_start_time ?? null),
                customEnd: trimTime(schedule?.custom_end_time ?? null),
              },
            ];
          }),
        ),
      ) as Record<string, CellScheduleState>,
  );
  const [bulkWorkerId, setBulkWorkerId] = useState(workers[0]?.id ?? "");
  const [bulkMode, setBulkMode] = useState<"off" | "shift" | "custom">("shift");
  const [bulkShiftId, setBulkShiftId] = useState("");
  const [bulkCustomStart, setBulkCustomStart] = useState("");
  const [bulkCustomEnd, setBulkCustomEnd] = useState("");
  const shiftsById = new Map(shifts.map((shift) => [shift.id, shift]));

  function applyBulkToDays(days: number[]) {
    setCells((current) => {
      const next = { ...current };

      for (const dayIndex of days) {
        const key = `${bulkWorkerId}_${dayIndex}`;
        next[key] = {
          mode: bulkMode,
          shiftId: bulkMode === "shift" ? bulkShiftId : "",
          customStart: bulkMode === "custom" ? bulkCustomStart : "",
          customEnd: bulkMode === "custom" ? bulkCustomEnd : "",
        };
      }

      return next;
    });
  }

  function updateCellMode(key: string, nextMode: CellMode) {
    setCells((current) => {
      const existing = current[key];

      return {
        ...current,
        [key]: {
          ...existing,
          mode: nextMode,
          shiftId: nextMode === "shift" ? existing.shiftId : "",
          customStart: nextMode === "custom" ? existing.customStart : "",
          customEnd: nextMode === "custom" ? existing.customEnd : "",
        },
      };
    });
  }

  return (
    <form action={action} className="space-y-5">
      <section className="grid gap-3 rounded-md border border-border bg-background p-4 lg:grid-cols-[14rem_10rem_1fr_1fr_auto_auto]">
        <div className="space-y-2">
          <label htmlFor="bulk_worker" className="text-sm font-medium text-foreground">
            Radnik
          </label>
          <select
            id="bulk_worker"
            value={bulkWorkerId}
            onChange={(event) => setBulkWorkerId(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          >
            {workers.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="bulk_mode" className="text-sm font-medium text-foreground">
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
            <option value="custom">Custom</option>
          </select>
        </div>

        {bulkMode === "shift" ? (
          <div className="space-y-2 lg:col-span-2">
            <label htmlFor="bulk_shift" className="text-sm font-medium text-foreground">
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
                  {formatShiftName(shift)}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {bulkMode === "custom" ? (
          <>
            <div className="space-y-2">
              <label htmlFor="bulk_custom_start" className="text-sm font-medium text-foreground">
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
              <label htmlFor="bulk_custom_end" className="text-sm font-medium text-foreground">
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
          Primeni celu nedelju
        </button>

        <button
          type="button"
          onClick={() => applyBulkToDays([1, 2, 3, 4, 5])}
          className="btn-secondary self-end rounded-md px-3 py-2 text-sm font-medium text-foreground"
        >
          Primeni pon-pet
        </button>
      </section>

      <div className="rounded-md border border-border bg-card">
        <div className="border-b border-border bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground sm:hidden">
          Prevuci tabelu levo/desno za ostale dane.
        </div>

        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[1660px] table-fixed border-collapse text-sm">
          <thead className="bg-muted text-left text-muted-foreground">
            <tr>
              <th className="w-52 border-b border-border px-3 py-3 font-medium">
                Radnik
              </th>
              {weekDays.map(([, dayName]) => (
                <th
                  key={dayName}
                  className="w-52 border-b border-border px-3 py-3 font-medium"
                >
                  {dayName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {workers.length ? (
              workers.map((worker) => (
                <tr key={worker.id} className="align-top">
                  <th className="px-3 py-4 text-left font-medium text-foreground">
                    {worker.name}
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">
                      {worker.is_active ? "Online" : "U pripremi"}
                    </span>
                  </th>
                  {weekDays.map(([dayIndex]) => {
                    const key = `${worker.id}_${dayIndex}`;
                    const schedule = cells[key];
                    const mode = schedule?.mode ?? "off";
                    const selectedShift = schedule?.shiftId
                      ? shiftsById.get(schedule.shiftId)
                      : null;

                    return (
                      <td key={key} className="w-52 space-y-2 px-3 py-4">
                        <select
                          id={`mode_${key}`}
                          name={`mode_${key}`}
                          value={mode}
                          onChange={(event) =>
                            updateCellMode(key, event.target.value as CellMode)
                          }
                          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                        >
                          <option value="off">Ne radi</option>
                          <option value="shift">Smena</option>
                          <option value="custom">Custom</option>
                        </select>

                        {mode === "shift" ? (
                          <select
                            id={`shift_${key}`}
                            name={`shift_${key}`}
                            value={schedule?.shiftId ?? ""}
                            onChange={(event) =>
                              setCells((current) => ({
                                ...current,
                                [key]: {
                                  ...current[key],
                                  shiftId: event.target.value,
                                },
                              }))
                            }
                            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                          >
                            <option value="">Bez smene</option>
                            {shifts.map((shift) => (
                              <option key={shift.id} value={shift.id}>
                                {formatShiftName(shift)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            id={`shift_${key}`}
                            name={`shift_${key}`}
                            type="hidden"
                            value=""
                            readOnly
                          />
                        )}

                        {mode === "shift" && selectedShift ? (
                          <p className="rounded-md bg-muted px-2 py-1 text-xs leading-5 text-muted-foreground">
                            {selectedShift.name}
                            <span className="block text-foreground">
                              {formatTime(selectedShift.start_time)} -{" "}
                              {formatTime(selectedShift.end_time)}
                            </span>
                          </p>
                        ) : null}

                        {mode === "custom" ? (
                          <div className="space-y-2 rounded-md bg-muted/50 p-2">
                            <div className="space-y-1">
                              <label
                                htmlFor={`custom_start_${key}`}
                                className="text-xs font-medium text-muted-foreground"
                              >
                                Od
                              </label>
                              <TimeInput
                                id={`custom_start_${key}`}
                                name={`custom_start_${key}`}
                                aria-label="Custom od"
                                value={schedule?.customStart ?? ""}
                                onValueChange={(nextValue) =>
                                  setCells((current) => ({
                                    ...current,
                                    [key]: {
                                      ...current[key],
                                      customStart: nextValue,
                                    },
                                  }))
                                }
                                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                              />
                            </div>

                            <div className="space-y-1">
                              <label
                                htmlFor={`custom_end_${key}`}
                                className="text-xs font-medium text-muted-foreground"
                              >
                                Do
                              </label>
                              <TimeInput
                                id={`custom_end_${key}`}
                                name={`custom_end_${key}`}
                                aria-label="Custom do"
                                value={schedule?.customEnd ?? ""}
                                onValueChange={(nextValue) =>
                                  setCells((current) => ({
                                    ...current,
                                    [key]: {
                                      ...current[key],
                                      customEnd: nextValue,
                                    },
                                  }))
                                }
                                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <input
                              id={`custom_start_${key}`}
                              name={`custom_start_${key}`}
                              type="hidden"
                              value={schedule?.customStart ?? ""}
                              readOnly
                            />
                            <input
                              id={`custom_end_${key}`}
                              name={`custom_end_${key}`}
                              type="hidden"
                              value={schedule?.customEnd ?? ""}
                              readOnly
                            />
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  Prvo dodaj radnike.
                </td>
              </tr>
            )}
          </tbody>
          </table>
        </div>
      </div>

      <button
        type="submit"
        disabled={!workers.length}
        className="btn-primary rounded-md px-4 py-2.5 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        Sacuvaj raspored
      </button>
    </form>
  );
}
