"use client";

import { useActionState, useState } from "react";
import { onboardingAction, type AuthActionState } from "@/app/auth/actions";
import { createProviderSlug } from "@/lib/slug";

const initialState: AuthActionState = {
  status: "idle",
  message: "",
};

const days = [
  ["1", "Pon"],
  ["2", "Uto"],
  ["3", "Sre"],
  ["4", "Čet"],
  ["5", "Pet"],
  ["6", "Sub"],
  ["0", "Ned"],
] as const;

type OnboardingFormProps = {
  initialProvider?: {
    name: string;
    slug: string;
    phone: string | null;
    city: string | null;
  } | null;
  refCode?: string;
};

export function OnboardingForm({
  initialProvider,
  refCode = "",
}: OnboardingFormProps) {
  const [state, formAction, pending] = useActionState(
    onboardingAction,
    initialState,
  );

  const field = (name: string, fallback = "") => state.fields?.[name] ?? fallback;
  const [providerName, setProviderName] = useState(
    field("provider_name", initialProvider?.name ?? ""),
  );
  const slug = createProviderSlug(providerName);

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="ref" value={field("ref", refCode)} />

      <section className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Nalog</h2>
          <p className="text-sm text-muted-foreground">
            Ovo je osnovni identitet javne booking stranice.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <label
              htmlFor="provider_name"
              className="text-sm font-medium text-foreground"
            >
              Naziv naloga
            </label>
            <input
              id="provider_name"
              name="provider_name"
              required
              value={providerName}
              onChange={(event) => setProviderName(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <p className="text-sm font-medium text-foreground">URL stranice</p>
            <div className="flex rounded-md border border-border bg-muted">
              <span className="shrink-0 border-r border-border px-3 py-2 text-sm text-muted-foreground">
                zakazi.pro/
              </span>
              <span className="min-w-0 flex-1 px-3 py-2 text-sm font-medium text-foreground">
                {slug || initialProvider?.slug}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              URL pravimo automatski po nazivu. Ako je zauzet, sistem dodaje broj.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="phone"
              className="text-sm font-medium text-foreground"
            >
              Telefon
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={field("phone", initialProvider?.phone ?? "")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="city" className="text-sm font-medium text-foreground">
              Grad
            </label>
            <input
              id="city"
              name="city"
              defaultValue={field("city", initialProvider?.city ?? "")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Prva smena i radnik
          </h2>
          <p className="text-sm text-muted-foreground">
            Dovoljno za početni raspored; detaljna podešavanja dolaze u adminu.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-3">
            <label
              htmlFor="worker_name"
              className="text-sm font-medium text-foreground"
            >
              Prvi radnik
            </label>
            <input
              id="worker_name"
              name="worker_name"
              required
              defaultValue={field("worker_name")}
              placeholder="Mila Petrović"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="shift_name"
              className="text-sm font-medium text-foreground"
            >
              Naziv smene
            </label>
            <input
              id="shift_name"
              name="shift_name"
              required
              defaultValue={field("shift_name", "Radno vreme")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="start_time"
              className="text-sm font-medium text-foreground"
            >
              Od
            </label>
            <input
              id="start_time"
              name="start_time"
              type="time"
              required
              defaultValue={field("start_time", "09:00")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="end_time"
              className="text-sm font-medium text-foreground"
            >
              Do
            </label>
            <input
              id="end_time"
              name="end_time"
              type="time"
              required
              defaultValue={field("end_time", "17:00")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-foreground">
            Radni dani
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-7">
            {days.map(([value, label]) => (
              <label
                key={value}
                className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground"
              >
                <input
                  type="checkbox"
                  name="work_days"
                  value={value}
                  defaultChecked={value !== "0" && value !== "6"}
                  className="size-4 accent-primary"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      {state.message ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="btn-primary w-full rounded-md px-4 py-2.5 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Čuvanje..." : "Završi onboarding"}
      </button>
    </form>
  );
}
