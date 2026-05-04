type ServiceFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  service?: {
    name: string;
    duration_minutes: number;
    price: number | null;
    sort_order: number;
    is_active: boolean;
  };
  submitLabel: string;
};

export function ServiceForm({
  action,
  service,
  submitLabel,
}: ServiceFormProps) {
  const currentSortOrder = Math.max(service?.sort_order ?? 1, 1);
  const sortOrderOptions = Array.from({ length: 20 }, (_, index) => index + 1);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium text-foreground">
          Naziv usluge
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={service?.name}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="space-y-2">
          <label
            htmlFor="duration_minutes"
            className="text-sm font-medium text-foreground"
          >
            Trajanje
          </label>
          <input
            id="duration_minutes"
            name="duration_minutes"
            type="number"
            min={5}
            step={5}
            required
            defaultValue={service?.duration_minutes ?? 30}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="price" className="text-sm font-medium text-foreground">
            Cena
          </label>
          <input
            id="price"
            name="price"
            type="number"
            min={0}
            step={1}
            defaultValue={service?.price ?? ""}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="sort_order"
            className="text-sm font-medium text-foreground"
          >
            Redosled
          </label>
          <select
            id="sort_order"
            name="sort_order"
            defaultValue={currentSortOrder}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          >
            {sortOrderOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={service?.is_active ?? true}
          className="size-4 accent-primary"
        />
        Aktivna usluga
      </label>

      <button
        type="submit"
        className="btn-primary rounded-md px-4 py-2.5 font-medium text-primary-foreground"
      >
        {submitLabel}
      </button>
    </form>
  );
}
