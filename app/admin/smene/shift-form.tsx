import { TimeInput } from "@/app/admin/_components/time-input";

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
      <section className="space-y-4 rounded-lg border border-border bg-muted/40 p-4 sm:p-5">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">
            Osnovne informacije
          </h3>
          <p className="text-sm text-muted-foreground">
            Naziv smene i glavno radno vreme koje se koristi u rasporedu.
          </p>
        </div>

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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 rounded-md border border-border bg-background p-3">
            <label
              htmlFor="start_time"
              className="text-sm font-medium text-foreground"
            >
              Pocetak
            </label>
            <TimeInput
              id="start_time"
              name="start_time"
              required
              defaultValue={trimSeconds(shift?.start_time)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div className="space-y-2 rounded-md border border-border bg-background p-3">
            <label
              htmlFor="end_time"
              className="text-sm font-medium text-foreground"
            >
              Kraj
            </label>
            <TimeInput
              id="end_time"
              name="end_time"
              required
              defaultValue={trimSeconds(shift?.end_time)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Pauza
          </p>
          <h3 className="text-base font-semibold text-foreground">
            Opcioni period pauze
          </h3>
          <p className="text-sm text-muted-foreground">
            Ostavite prazno ako smena nema definisanu pauzu.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 rounded-md border border-border bg-background p-3">
            <label
              htmlFor="break_start"
              className="text-sm font-medium text-foreground"
            >
              Pauza od
            </label>
            <TimeInput
              id="break_start"
              name="break_start"
              defaultValue={trimSeconds(shift?.break_start)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div className="space-y-2 rounded-md border border-border bg-background p-3">
            <label
              htmlFor="break_end"
              className="text-sm font-medium text-foreground"
            >
              Pauza do
            </label>
            <TimeInput
              id="break_end"
              name="break_end"
              defaultValue={trimSeconds(shift?.break_end)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>
      </section>

      <button
        type="submit"
        className="btn-primary rounded-md px-4 py-2.5 font-medium text-primary-foreground"
      >
        {submitLabel}
      </button>
    </form>
  );
}
