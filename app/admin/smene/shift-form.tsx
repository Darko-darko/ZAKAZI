type ShiftFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  shift?: {
    name: string;
    start_time: string;
    end_time: string;
    break_start: string | null;
    break_end: string | null;
  };
  submitLabel: string;
};

function trimSeconds(value: string | null | undefined) {
  return value ? value.slice(0, 5) : "";
}

export function ShiftForm({ action, shift, submitLabel }: ShiftFormProps) {
  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium text-foreground">
          Naziv smene
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={shift?.name}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="start_time"
            className="text-sm font-medium text-foreground"
          >
            Pocetak
          </label>
          <input
            id="start_time"
            name="start_time"
            type="time"
            required
            defaultValue={trimSeconds(shift?.start_time)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="end_time"
            className="text-sm font-medium text-foreground"
          >
            Kraj
          </label>
          <input
            id="end_time"
            name="end_time"
            type="time"
            required
            defaultValue={trimSeconds(shift?.end_time)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="break_start"
            className="text-sm font-medium text-foreground"
          >
            Pauza od
          </label>
          <input
            id="break_start"
            name="break_start"
            type="time"
            defaultValue={trimSeconds(shift?.break_start)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="break_end"
            className="text-sm font-medium text-foreground"
          >
            Pauza do
          </label>
          <input
            id="break_end"
            name="break_end"
            type="time"
            defaultValue={trimSeconds(shift?.break_end)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>
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
