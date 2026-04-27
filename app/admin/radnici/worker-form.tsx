type WorkerFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  worker?: {
    name: string;
    bio: string | null;
  };
};

export function WorkerForm({ action, submitLabel, worker }: WorkerFormProps) {
  return (
    <form action={action} className="space-y-5">
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
        className="rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground transition hover:opacity-90"
      >
        {submitLabel}
      </button>
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
  action: (formData: FormData) => void | Promise<void>;
  selectedServiceIds: string[];
  services: WorkerService[];
};

export function WorkerServicesForm({
  action,
  selectedServiceIds,
  services,
}: WorkerServicesFormProps) {
  const selectedIds = new Set(selectedServiceIds);

  return (
    <form action={action} className="space-y-5">
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
        disabled={!services.length}
        className="rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Sacuvaj usluge radnika
      </button>
    </form>
  );
}

type WorkerScheduleFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  schedules: WorkerSchedule[];
  shifts: WorkerShift[];
};

export function WorkerScheduleForm({
  action,
  schedules,
  shifts,
}: WorkerScheduleFormProps) {
  const scheduleByDay = new Map(
    schedules.map((schedule) => [schedule.day_of_week, schedule.shift_id]),
  );

  return (
    <form action={action} className="space-y-5">
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
        disabled={!shifts.length}
        className="rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Sacuvaj raspored
      </button>
    </form>
  );
}
