import Link from "next/link";
import { getCurrentProvider } from "@/lib/admin/provider";
import { AdminAlertBox } from "@/app/admin/_components/admin-alert-box";
import { updateScheduleMatrixAction } from "./actions";
import { ScheduleMatrixForm } from "./schedule-matrix-form";

export const metadata = {
  title: "Raspored | zakazi.pro",
};

type ScheduleRow = {
  worker_id: string;
  day_of_week: number;
  shift_id: string | null;
  custom_start_time: string | null;
  custom_end_time: string | null;
};

type WorkingHourRow = {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
};

type ShiftRow = {
  id: string;
  start_time: string;
  end_time: string;
};

const weekDays = [
  [1, "ponedeljak"],
  [2, "utorak"],
  [3, "sredu"],
  [4, "cetvrtak"],
  [5, "petak"],
  [6, "subotu"],
  [0, "nedelju"],
] as const;

function formatTime(value: string | null) {
  return value?.slice(0, 5) ?? "";
}

export default async function SchedulePage() {
  const { supabase, provider } = await getCurrentProvider();
  const [
    { data: workers },
    { data: shifts },
    { data: schedules },
    { data: workingHours },
  ] = await Promise.all([
      supabase
        .from("workers")
        .select("id, name, is_active")
        .eq("provider_id", provider.id)
        .is("archived_at", null)
        .order("created_at", { ascending: true }),
      supabase
        .from("shifts")
        .select("id, name, start_time, end_time")
        .eq("provider_id", provider.id)
        .order("start_time", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("worker_schedule")
        .select("worker_id, day_of_week, shift_id, custom_start_time, custom_end_time")
        .order("day_of_week", { ascending: true }),
      supabase
        .from("provider_working_hours")
        .select("day_of_week, opens_at, closes_at, is_closed")
        .eq("provider_id", provider.id)
        .order("day_of_week", { ascending: true }),
    ]);
  const scheduleRows = (schedules ?? []) as ScheduleRow[];
  const workingHourRows = (workingHours ?? []) as WorkingHourRow[];
  const shiftRows = (shifts ?? []) as ShiftRow[];
  const shiftsById = new Map(shiftRows.map((shift) => [shift.id, shift]));
  const workingHoursByDay = new Map(
    workingHourRows.map((row) => [row.day_of_week, row]),
  );
  const hasAnySchedule = scheduleRows.some(
    (schedule) => schedule.shift_id || schedule.custom_start_time,
  );
  const daysWithWorkers = new Set(
    scheduleRows
      .filter((schedule) => schedule.shift_id || schedule.custom_start_time)
      .map((schedule) => schedule.day_of_week),
  );
  const openDaysWithoutWorkers = weekDays
    .map(([dayIndex, dayName]) => {
      const hours = workingHourRows.find(
        (item) => item.day_of_week === dayIndex,
      );

      if (
        !hours ||
        hours.is_closed ||
        !hours.opens_at ||
        !hours.closes_at ||
        daysWithWorkers.has(dayIndex)
      ) {
        return null;
      }

      return {
        dayName,
        opensAt: formatTime(hours.opens_at),
        closesAt: formatTime(hours.closes_at),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const invalidScheduleRows = scheduleRows.filter((row) => {
    const day = workingHoursByDay.get(row.day_of_week);
    const shift = row.shift_id ? shiftsById.get(row.shift_id) : null;

    if (!day || day.is_closed) {
      return Boolean(shift);
    }

    if (!shift || !day.opens_at || !day.closes_at) {
      return false;
    }

    return shift.start_time < day.opens_at || shift.end_time > day.closes_at;
  });
  const showNoScheduleAlert =
    !hasAnySchedule && (workers ?? []).length > 0 && workingHourRows.some((row) => !row.is_closed);

  return (
    <main className="flex flex-1 px-6 py-10">
      <section className="mx-auto w-full max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              Admin
            </Link>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              Raspored radnika
            </h1>
            <p className="text-muted-foreground">{provider.name}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/radno-vreme"
              className="btn-secondary inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-foreground"
            >
              Radno vreme
            </Link>
            <Link
              href="/admin/smene"
              className="btn-secondary inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-foreground"
            >
              Smene
            </Link>
          </div>
        </header>

        {showNoScheduleAlert ? (
          <AdminAlertBox
            title="Nijedan radnik nema raspored."
            description="Da bi se pojavili slobodni termini, dodaj smenu ili custom vreme bar jednom radniku za otvorene dane."
          />
        ) : null}

        {openDaysWithoutWorkers.length ? (
          <AdminAlertBox
            title="Neki otvoreni dani nemaju radnike."
            description="Klijenti nece moci da zakazu termin za te dane dok bar jednom radniku ne dodelis smenu ili custom vreme."
          >
            <ul className="mt-3 list-disc space-y-1 pl-5">
              {openDaysWithoutWorkers.map((day) => (
                <li key={day.dayName}>
                  Radno vreme je otvoreno za {day.dayName} od {day.opensAt} do{" "}
                  {day.closesAt}, ali nijedan radnik ne radi.
                </li>
              ))}
            </ul>
          </AdminAlertBox>
        ) : null}

        {invalidScheduleRows.length ? (
          <AdminAlertBox
            title="Smene van radnog vremena."
            description={
              invalidScheduleRows.length === 1
                ? "Jedna smena ili raspored je van otvorenog radnog vremena salona — slobodni termini se nece prikazati ispravno."
                : `${invalidScheduleRows.length} rasporeda ili smena izlaze van otvorenog radnog vremena salona — slobodni termini se nece prikazati ispravno.`
            }
          />
        ) : null}

        <ScheduleMatrixForm
          action={updateScheduleMatrixAction}
          workers={workers ?? []}
          shifts={shifts ?? []}
          schedules={scheduleRows}
        />
      </section>
    </main>
  );
}
