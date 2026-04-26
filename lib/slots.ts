import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Supabase = SupabaseClient<Database>;

type Shift = Database["public"]["Tables"]["shifts"]["Row"];
type Booking = Pick<
  Database["public"]["Tables"]["bookings"]["Row"],
  "worker_id" | "starts_at" | "ends_at"
>;

type Worker = Pick<
  Database["public"]["Tables"]["workers"]["Row"],
  "id" | "name" | "buffer_minutes"
>;

export type AvailableSlot = {
  workerId: string;
  workerName: string;
  startsAt: string;
  endsAt: string;
};

export type GetAvailableSlotsParams = {
  providerId: string;
  serviceId: string;
  date: string;
  workerId?: string;
  timeZone?: string;
};

const SLOT_STEP_MINUTES = 10;
const DEFAULT_TIME_ZONE = "Europe/Belgrade";
const ACTIVE_BOOKING_STATUSES = ["pending", "confirmed"];

function parseDate(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  if (!match) {
    throw new Error("Date must be in YYYY-MM-DD format.");
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number) {
  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");

  return `${hours}:${mins}`;
}

function roundUpToStep(minutes: number) {
  return Math.ceil(minutes / SLOT_STEP_MINUTES) * SLOT_STEP_MINUTES;
}

function getDayOfWeek(date: string) {
  const { year, month, day } = parseDate(date);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function diffDays(fromDate: string, toDate: string) {
  const from = parseDate(fromDate);
  const to = parseDate(toDate);
  const fromUtc = Date.UTC(from.year, from.month - 1, from.day);
  const toUtc = Date.UTC(to.year, to.month - 1, to.day);

  return Math.floor((toUtc - fromUtc) / 86_400_000);
}

function getOffsetMs(timeZone: string, date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  });
  const value = formatter
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;
  const match = /^GMT([+-])(\d{2}):(\d{2})$/.exec(value ?? "");

  if (!match) {
    return 0;
  }

  const sign = match[1] === "+" ? 1 : -1;
  return sign * (Number(match[2]) * 60 + Number(match[3])) * 60_000;
}

function zonedTimeToUtc(date: string, minutes: number, timeZone: string) {
  const { year, month, day } = parseDate(date);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const localAsUtc = Date.UTC(year, month - 1, day, hours, mins);
  const firstPass = new Date(localAsUtc - getOffsetMs(timeZone, new Date(localAsUtc)));

  return new Date(localAsUtc - getOffsetMs(timeZone, firstPass));
}

function getZonedDateParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function bookingToInterval(booking: Booking, date: string, timeZone: string) {
  const starts = getZonedDateParts(new Date(booking.starts_at), timeZone);
  const ends = getZonedDateParts(new Date(booking.ends_at), timeZone);

  return {
    start: starts.date < date ? 0 : starts.minutes,
    end: ends.date > date ? 24 * 60 : ends.minutes,
  };
}

function subtractInterval(
  intervals: Array<{ start: number; end: number }>,
  blocked: { start: number; end: number },
) {
  return intervals.flatMap((interval) => {
    const start = Math.max(blocked.start, interval.start);
    const end = Math.min(blocked.end, interval.end);

    if (start >= end) {
      return [interval];
    }

    return [
      { start: interval.start, end: start },
      { start: end, end: interval.end },
    ].filter((item) => item.start < item.end);
  });
}

async function getShiftById(supabase: Supabase, shiftId: string | null) {
  if (!shiftId) {
    return null;
  }

  const { data } = await supabase
    .from("shifts")
    .select("id, provider_id, name, start_time, end_time, break_start, break_end")
    .eq("id", shiftId)
    .maybeSingle();

  return data;
}

async function getWorkerShift(
  supabase: Supabase,
  providerId: string,
  workerId: string,
  date: string,
) {
  const dayOfWeek = getDayOfWeek(date);

  const { data: override } = await supabase
    .from("schedule_overrides")
    .select("shift_id")
    .eq("worker_id", workerId)
    .eq("date", date)
    .maybeSingle();

  if (override) {
    return getShiftById(supabase, override.shift_id);
  }

  const { data: rotation } = await supabase
    .from("shift_rotations")
    .select("id, rotation_start_date")
    .eq("provider_id", providerId)
    .lte("rotation_start_date", date)
    .order("rotation_start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (rotation) {
    const { data: member } = await supabase
      .from("shift_rotation_members")
      .select("week_odd_shift_id, week_even_shift_id")
      .eq("rotation_id", rotation.id)
      .eq("worker_id", workerId)
      .eq("day_of_week", dayOfWeek)
      .maybeSingle();

    if (member) {
      const weekNumber = Math.floor(diffDays(rotation.rotation_start_date, date) / 7) + 1;
      const shiftId =
        weekNumber % 2 === 1
          ? member.week_odd_shift_id
          : member.week_even_shift_id;

      return getShiftById(supabase, shiftId);
    }
  }

  const { data: weeklySchedule } = await supabase
    .from("worker_schedule")
    .select("shift_id")
    .eq("worker_id", workerId)
    .eq("day_of_week", dayOfWeek)
    .maybeSingle();

  return getShiftById(supabase, weeklySchedule?.shift_id ?? null);
}

function buildSlotsForWorker({
  worker,
  shift,
  bookings,
  date,
  durationMinutes,
  timeZone,
  earliestStart,
  latestStart,
}: {
  worker: Worker;
  shift: Shift;
  bookings: Booking[];
  date: string;
  durationMinutes: number;
  timeZone: string;
  earliestStart: Date;
  latestStart: Date;
}) {
  let intervals = [
    {
      start: timeToMinutes(shift.start_time),
      end: timeToMinutes(shift.end_time),
    },
  ];

  if (shift.break_start && shift.break_end) {
    intervals = subtractInterval(intervals, {
      start: timeToMinutes(shift.break_start),
      end: timeToMinutes(shift.break_end),
    });
  }

  for (const booking of bookings) {
    const interval = bookingToInterval(booking, date, timeZone);
    intervals = subtractInterval(intervals, {
      start: Math.max(0, interval.start - worker.buffer_minutes),
      end: Math.min(24 * 60, interval.end + worker.buffer_minutes),
    });
  }

  return intervals.flatMap((interval) => {
    const slots: AvailableSlot[] = [];

    for (
      let start = roundUpToStep(interval.start);
      start + durationMinutes <= interval.end;
      start += SLOT_STEP_MINUTES
    ) {
      const end = start + durationMinutes;
      const startsAt = zonedTimeToUtc(date, start, timeZone);
      const endsAt = zonedTimeToUtc(date, end, timeZone);

      if (startsAt < earliestStart || startsAt >= latestStart) {
        continue;
      }

      slots.push({
        workerId: worker.id,
        workerName: worker.name,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
      });
    }

    return slots;
  });
}

export async function getAvailableSlots(
  supabase: Supabase,
  {
    providerId,
    serviceId,
    date,
    workerId,
    timeZone = DEFAULT_TIME_ZONE,
  }: GetAvailableSlotsParams,
) {
  const [{ data: provider }, { data: service }] = await Promise.all([
    supabase
      .from("providers")
      .select("id, booking_min_notice_hours, booking_max_days_ahead, plan_status")
      .eq("id", providerId)
      .in("plan_status", ["trial", "active", "past_due"])
      .maybeSingle(),
    supabase
      .from("services")
      .select("id, provider_id, duration_minutes, is_active")
      .eq("id", serviceId)
      .eq("provider_id", providerId)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  if (!provider || !service) {
    return [];
  }

  let workersQuery = supabase
    .from("workers")
    .select("id, name, buffer_minutes")
    .eq("provider_id", providerId)
    .eq("is_active", true)
    .is("archived_at", null)
    .order("created_at");

  if (workerId) {
    workersQuery = workersQuery.eq("id", workerId);
  }

  const { data: activeWorkers } = await workersQuery;

  if (!activeWorkers?.length) {
    return [];
  }

  const activeWorkerIds = activeWorkers.map((worker) => worker.id);
  const { data: serviceLinks } = await supabase
    .from("worker_services")
    .select("worker_id")
    .eq("service_id", service.id)
    .in("worker_id", activeWorkerIds);
  const serviceWorkerIds = new Set(
    serviceLinks?.map((link) => link.worker_id) ?? [],
  );
  const workers = activeWorkers.filter((worker) => serviceWorkerIds.has(worker.id));

  if (!workers.length) {
    return [];
  }

  const dayStart = zonedTimeToUtc(date, 0, timeZone);
  const dayEnd = zonedTimeToUtc(date, 24 * 60, timeZone);

  const [{ data: timeOffRows }, { data: bookings }] = await Promise.all([
    supabase
      .from("time_off")
      .select("worker_id")
      .eq("provider_id", providerId)
      .lte("date_from", date)
      .gte("date_to", date),
    supabase
      .from("bookings")
      .select("worker_id, starts_at, ends_at")
      .eq("provider_id", providerId)
      .in("worker_id", workers.map((worker) => worker.id))
      .in("status", ACTIVE_BOOKING_STATUSES)
      .lt("starts_at", dayEnd.toISOString())
      .gt("ends_at", dayStart.toISOString()),
  ]);

  const absentWorkerIds = new Set(
    timeOffRows
      ?.filter((row) => row.worker_id === null || serviceWorkerIds.has(row.worker_id))
      .map((row) => row.worker_id)
      .filter((id): id is string => id !== null) ?? [],
  );
  const providerClosed = timeOffRows?.some((row) => row.worker_id === null) ?? false;

  if (providerClosed) {
    return [];
  }

  const now = new Date();
  const earliestStart = new Date(
    now.getTime() + provider.booking_min_notice_hours * 60 * 60_000,
  );
  const latestStart = new Date(
    now.getTime() + provider.booking_max_days_ahead * 24 * 60 * 60_000,
  );
  const bookingsByWorker = new Map<string, Booking[]>();

  for (const booking of bookings ?? []) {
    const workerBookings = bookingsByWorker.get(booking.worker_id) ?? [];
    workerBookings.push(booking);
    bookingsByWorker.set(booking.worker_id, workerBookings);
  }

  const slots: AvailableSlot[] = [];

  for (const worker of workers) {
    if (absentWorkerIds.has(worker.id)) {
      continue;
    }

    const shift = await getWorkerShift(supabase, providerId, worker.id, date);

    if (!shift) {
      continue;
    }

    slots.push(
      ...buildSlotsForWorker({
        worker,
        shift,
        bookings: bookingsByWorker.get(worker.id) ?? [],
        date,
        durationMinutes: service.duration_minutes,
        timeZone,
        earliestStart,
        latestStart,
      }),
    );
  }

  return slots.sort((left, right) => {
    if (left.startsAt === right.startsAt) {
      return left.workerName.localeCompare(right.workerName);
    }

    return left.startsAt.localeCompare(right.startsAt);
  });
}

export function formatSlotTime(slot: Pick<AvailableSlot, "startsAt">, timeZone = DEFAULT_TIME_ZONE) {
  const parts = getZonedDateParts(new Date(slot.startsAt), timeZone);
  return minutesToTime(parts.minutes);
}
