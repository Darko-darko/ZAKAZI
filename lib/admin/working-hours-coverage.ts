type ScheduleCoverageRow = {
  worker_id: string;
  day_of_week: number;
  shift_id: string | null;
  custom_start_time: string | null;
  custom_end_time: string | null;
};

type WorkingHourCoverageRow = {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
};

type ShiftCoverageRow = {
  id: string;
  start_time: string;
  end_time: string;
};

type CoverageGap = {
  dayOfWeek: number;
  gapStart: string;
  gapEnd: string;
};

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function toTimeString(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function findWorkingHourCoverageGaps(params: {
  schedules: ScheduleCoverageRow[];
  workingHours: WorkingHourCoverageRow[];
  shifts: ShiftCoverageRow[];
}) {
  const shiftsById = new Map(params.shifts.map((shift) => [shift.id, shift]));
  const gaps: CoverageGap[] = [];

  for (const day of params.workingHours) {
    if (day.is_closed || !day.opens_at || !day.closes_at) {
      continue;
    }

    const dayOpen = toMinutes(day.opens_at);
    const dayClose = toMinutes(day.closes_at);
    const intervals = params.schedules
      .filter((row) => row.day_of_week === day.day_of_week)
      .flatMap((row) => {
        const shift = row.shift_id ? shiftsById.get(row.shift_id) : null;
        const startValue = shift?.start_time ?? row.custom_start_time;
        const endValue = shift?.end_time ?? row.custom_end_time;

        if (!startValue || !endValue) {
          return [];
        }

        const start = Math.max(toMinutes(startValue), dayOpen);
        const end = Math.min(toMinutes(endValue), dayClose);

        if (end <= start) {
          return [];
        }

        return [{ start, end }];
      })
      .sort((a, b) => a.start - b.start);

    if (intervals.length === 0) {
      continue;
    }

    let cursor = dayOpen;

    for (const interval of intervals) {
      if (interval.start > cursor) {
        gaps.push({
          dayOfWeek: day.day_of_week,
          gapStart: toTimeString(cursor),
          gapEnd: toTimeString(interval.start),
        });
      }

      cursor = Math.max(cursor, interval.end);
    }

    if (cursor < dayClose) {
      gaps.push({
        dayOfWeek: day.day_of_week,
        gapStart: toTimeString(cursor),
        gapEnd: toTimeString(dayClose),
      });
    }
  }

  return gaps;
}
