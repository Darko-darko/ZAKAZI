"use client";

import { ReferralLinkActions } from "@/app/_components/referral-link-actions";
import { useActionState, useState } from "react";
import {
  createCommercialistAction,
  type CreateCommercialistState,
} from "./actions";

const initialState: CreateCommercialistState = {
  status: "idle",
  message: "",
};

export function NewCommercialistForm({
  maxPercent,
}: {
  maxPercent: number;
}) {
  const [state, formAction, pending] = useActionState(
    createCommercialistAction,
    initialState,
  );
  const [copied, setCopied] = useState(false);

  const fields = state.fields ?? {};
  const formKey =
    state.status === "success"
      ? `success-${state.commercialistRefCode ?? ""}`
      : "form";

  async function copyPassword() {
    if (!state.generatedPassword) {
      return;
    }

    try {
      await navigator.clipboard.writeText(state.generatedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-5">
      {state.status === "success" && state.generatedPassword ? (
        <div className="rounded-md border border-green-500/40 bg-green-500/10 p-5 text-foreground">
          <p className="text-sm font-semibold text-green-700 dark:text-green-300">
            Komercijalista &quot;{state.commercialistName}&quot; je kreiran
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Email:{" "}
            <span className="font-medium text-foreground">
              {state.commercialistEmail}
            </span>
            {" · "}Interni kod:{" "}
            <span className="font-mono font-semibold text-foreground">
              {state.commercialistRefCode}
            </span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Lozinku vidiš samo jednom. Komercijalista kasnije može koristiti
            &quot;Zaboravljena lozinka&quot;.
          </p>
          {state.commercialistRefCode ? (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-foreground">
                Referral link za deljenje
              </p>
              <ReferralLinkActions refCode={state.commercialistRefCode} />
            </div>
          ) : null}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <code className="rounded-md border border-border bg-background px-3 py-2 font-mono text-base font-bold tracking-wider text-foreground">
              {state.generatedPassword}
            </code>
            <button
              type="button"
              onClick={copyPassword}
              className="btn-secondary inline-flex min-h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-foreground"
            >
              {copied ? "Kopirano ✓" : "Kopiraj"}
            </button>
          </div>
        </div>
      ) : null}

      {state.status === "error" ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {state.message}
        </div>
      ) : null}

      <form key={formKey} action={formAction} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="name" className="text-sm font-medium text-foreground">
              Ime i prezime komercijaliste
            </label>
            <input
              id="name"
              name="name"
              required
              defaultValue={fields.name ?? ""}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email komercijaliste
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={fields.email ?? ""}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
            <p className="text-xs text-muted-foreground">
              Sa ovim emailom se komercijalista prijavljuje na svoj panel.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium text-foreground">
              Telefon
            </label>
            <input
              id="phone"
              name="phone"
              defaultValue={fields.phone ?? ""}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="default_commission_percent"
              className="text-sm font-medium text-foreground"
            >
              Provizija (%)
            </label>
            <input
              id="default_commission_percent"
              name="default_commission_percent"
              type="number"
              min={0}
              max={maxPercent}
              required
              defaultValue={fields.default_commission_percent ?? String(maxPercent)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
            <p className="text-xs text-muted-foreground">
              Maksimum je tvoj trenutni procenat: {maxPercent}%.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="btn-primary inline-flex min-h-11 w-full items-center justify-center rounded-md px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50 sm:w-auto"
        >
          {pending ? "Kreiram..." : "Kreiraj komercijalistu"}
        </button>
      </form>
    </div>
  );
}
